import type { Request, Response } from "express";
import { Role } from "@prisma/client";
import { frontendUrl } from "@/config";

const roleRedirects: Record<Role, string> = {
  [Role.ADMIN]: "/admin/dashboard",
  [Role.USER]: "/dashboard",
};

export function redirectByRole(req: Request, res: Response) {
  const role = req.authenticatedUser?.role ?? Role.USER;
  const redirectPath = roleRedirects[role];

  return res.redirect(303, `${frontendUrl}${redirectPath}`);
}
