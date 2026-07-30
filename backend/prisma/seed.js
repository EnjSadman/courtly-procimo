const bcrypt = require("bcrypt");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role, BookingStatus } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function getDefaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatDateInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(utcDate, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(utcDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asLocal - utcDate.getTime();
}

function zonedDateTimeToUtc(date, time, timeZone) {
  const wallAsUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(time.slice(0, 2)),
    Number(time.slice(3, 5)),
    0,
    0,
  );

  let utcMillis = wallAsUtc;
  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMillis), timeZone);
    utcMillis = wallAsUtc - offset;
  }

  return new Date(utcMillis);
}

async function ensureUser(email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, passwordHash, role },
  });
}

async function ensureCourt(
  name,
  sportTypeId,
  hourlyPrice,
  openTime,
  closeTime,
  timezone,
) {
  const existingCourts = await prisma.court.findMany({
    where: { name },
  });

  if (existingCourts.length > 0) {
    const [primary, ...duplicates] = existingCourts;

    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map((court) => court.id);
      await prisma.booking.deleteMany({
        where: { courtId: { in: duplicateIds } },
      });
      await prisma.court.deleteMany({
        where: { id: { in: duplicateIds } },
      });
    }

    return prisma.court.update({
      where: { id: primary.id },
      data: {
        sportTypeId,
        hourlyPrice,
        openTime,
        closeTime,
        timezone,
        isActive: true,
      },
    });
  }

  return prisma.court.create({
    data: {
      name,
      sportTypeId,
      hourlyPrice,
      openTime,
      closeTime,
      timezone,
      isActive: true,
    },
  });
}

function parseHour(time) {
  return Number(time.split(":")[0]);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function ensureBusyBlock(userId, court, startsAt, durationHours) {
  for (let offset = 0; offset < durationHours; offset += 1) {
    const slotStart = new Date(startsAt.getTime() + offset * 60 * 60 * 1000);
    const existingSlot = await prisma.bookingSlot.findUnique({
      where: {
        courtId_startsAt: {
          courtId: court.id,
          startsAt: slotStart,
        },
      },
      select: { id: true },
    });

    if (existingSlot) {
      return null;
    }
  }

  const hourlyPrice = Number(court.hourlyPrice);
  const price = (hourlyPrice * durationHours).toFixed(2);

  const booking = await prisma.booking.create({
    data: {
      userId,
      courtId: court.id,
      startsAt,
      duration: durationHours,
      price,
      status: BookingStatus.CONFIRMED,
      activityNote: "Seeded busy block",
    },
  });

  const slots = Array.from({ length: durationHours }, (_, offset) => ({
    courtId: court.id,
    bookingId: booking.id,
    startsAt: new Date(startsAt.getTime() + offset * 60 * 60 * 1000),
  }));

  await prisma.bookingSlot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  return booking;
}

async function clearSeededBusyBlocks(userId) {
  await prisma.booking.deleteMany({
    where: {
      userId,
      activityNote: "Seeded busy block",
    },
  });
}

async function seedRandomBusyBlocks(
  userId,
  courts,
  { dayOffsets = [0, 1, 2, 3], blocksPerCourtPerDay = 3 } = {},
) {
  let createdCount = 0;

  for (const court of courts) {
    const openHour = parseHour(court.openTime);
    const closeHour = parseHour(court.closeTime);
    const today = formatDateInTimeZone(new Date(), court.timezone);

    for (const dayOffset of dayOffsets) {
      const date = addCalendarDays(today, dayOffset);
      const availableHours = new Set();
      for (let hour = openHour; hour < closeHour; hour += 1) {
        availableHours.add(hour);
      }

      let attempts = 0;
      let createdForDay = 0;

      while (createdForDay < blocksPerCourtPerDay && attempts < 20) {
        attempts += 1;
        const candidates = [...availableHours];
        if (candidates.length === 0) {
          break;
        }

        const hour = pickRandom(candidates);
        const maxDuration = Math.min(
          2,
          [...availableHours].filter(
            (value) => value >= hour && value < hour + 2,
          ).length,
          closeHour - hour,
        );

        if (maxDuration < 1) {
          availableHours.delete(hour);
          continue;
        }

        const durationHours = maxDuration === 1 ? 1 : pickRandom([1, 2]);
        const startsAt = zonedDateTimeToUtc(
          date,
          `${String(hour).padStart(2, "0")}:00`,
          court.timezone,
        );

        const created = await ensureBusyBlock(
          userId,
          court,
          startsAt,
          durationHours,
        );

        if (!created) {
          availableHours.delete(hour);
          continue;
        }

        for (let offset = 0; offset < durationHours; offset += 1) {
          availableHours.delete(hour + offset);
        }

        createdForDay += 1;
        createdCount += 1;
      }
    }
  }

  return createdCount;
}

async function main() {
  const timezone = getDefaultTimeZone();
  const adminUser = await ensureUser(
    "admin@courtly.local",
    "admin123",
    Role.ADMIN,
  );
  const regularUser = await ensureUser(
    "user@courtly.local",
    "user123",
    Role.USER,
  );

  const tennis = await prisma.sportType.upsert({
    where: { name: "Tennis" },
    update: {},
    create: { name: "Tennis" },
  });

  const padel = await prisma.sportType.upsert({
    where: { name: "Padel" },
    update: {},
    create: { name: "Padel" },
  });

  const tennisCourt = await ensureCourt(
    "Central Court",
    tennis.id,
    "40.00",
    "08:00",
    "22:00",
    timezone,
  );
  const padelCourt = await ensureCourt(
    "Padel Arena",
    padel.id,
    "32.50",
    "09:00",
    "23:00",
    timezone,
  );

  await clearSeededBusyBlocks(regularUser.id);

  const createdBusyBlocks = await seedRandomBusyBlocks(
    regularUser.id,
    [tennisCourt, padelCourt],
    {
      dayOffsets: [0, 1, 2, 3],
      blocksPerCourtPerDay: 3,
    },
  );

  console.info("Seed completed.");
  console.info("Admin user: admin@courtly.local / admin123");
  console.info("Regular user: user@courtly.local / user123");
  console.info(`Seeded by ${adminUser.email}`);
  console.info(`Court timezone: ${timezone}`);
  console.info(`Busy blocks created: ${createdBusyBlocks}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
