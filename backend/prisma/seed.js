const bcrypt = require("bcrypt");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role, BookingStatus } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function ensureUser(email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, passwordHash, role },
  });
}

async function ensureCourt(name, sportTypeId, hourlyPrice, openTime, closeTime) {
  const existingCourt = await prisma.court.findFirst({
    where: { name, sportTypeId },
  });

  if (existingCourt) {
    return prisma.court.update({
      where: { id: existingCourt.id },
      data: { hourlyPrice, openTime, closeTime, isActive: true },
    });
  }

  return prisma.court.create({
    data: {
      name,
      sportTypeId,
      hourlyPrice,
      openTime,
      closeTime,
      isActive: true,
    },
  });
}

async function main() {
  const adminUser = await ensureUser("admin@courtly.local", "admin123", Role.ADMIN);
  const regularUser = await ensureUser("user@courtly.local", "user123", Role.USER);

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

  const tennisCourt = await ensureCourt("Central Court", tennis.id, "40.00", "08:00", "22:00");
  await ensureCourt("Padel Arena", padel.id, "32.50", "09:00", "23:00");

  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId: regularUser.id,
      courtId: tennisCourt.id,
    },
  });

  if (!existingBooking) {
    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    startsAt.setUTCHours(10, 0, 0, 0);

    const booking = await prisma.booking.create({
      data: {
        userId: regularUser.id,
        courtId: tennisCourt.id,
        startsAt,
        duration: 2,
        price: "80.00",
        status: BookingStatus.CONFIRMED,
        activityNote: "Seeded sample booking",
      },
    });

    await prisma.bookingSlot.createMany({
      data: [
        {
          courtId: tennisCourt.id,
          bookingId: booking.id,
          startsAt,
        },
        {
          courtId: tennisCourt.id,
          bookingId: booking.id,
          startsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        },
      ],
      skipDuplicates: true,
    });
  }

  console.info("Seed completed.");
  console.info("Admin user: admin@courtly.local / admin123");
  console.info("Regular user: user@courtly.local / user123");
  console.info(`Seeded by ${adminUser.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
