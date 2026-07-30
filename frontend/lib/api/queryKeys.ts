export const queryKeys = {
  profileMe: ["profiles", "me"] as const,
  profile: (userId: string) => ["profiles", userId] as const,
  courts: ["courts"] as const,
  occupiedSlots: (from: string, to: string, courtIds: string[] = []) =>
    ["bookings", "occupied", from, to, ...courtIds] as const,
  dailyBookings: (date: string) => ["bookings", "daily", date] as const,
  sportTypes: ["sport-types"] as const,
};
