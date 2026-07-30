import type { Role } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
      rememberMe?: boolean;
    }
  }
}

export {};
