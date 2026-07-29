export const queryKeys = {
  profileMe: ["profiles", "me"] as const,
  profile: (userId: string) => ["profiles", userId] as const,
  courts: ["courts"] as const,
  sportTypes: ["sport-types"] as const,
};
