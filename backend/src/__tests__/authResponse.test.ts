jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-token"),
  })),
  decodeJwt: jest.fn().mockReturnValue({
    exp: Math.floor(Date.now() / 1000) + 60,
  }),
}));

import { Role } from "@prisma/client";
import { authResponse } from "@/middleware/authResponse";

describe("authResponse", () => {
  it("returns 401 when the authenticated user is missing", async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as any;

    await authResponse({} as any, res, jest.fn());

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("sets a token cookie and returns the user redirect", async () => {
    const cookie = jest.fn();
    const json = jest.fn();
    const res = { cookie, json } as any;

    await authResponse(
      {
        authenticatedUser: {
          id: "user-1",
          role: Role.USER,
          email: "user@example.com",
        },
      } as any,
      res,
      jest.fn(),
    );

    expect(cookie).toHaveBeenCalledWith(
      "token",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      }),
    );
    expect(json).toHaveBeenCalledWith({
      redirect: "http://localhost:3000/dashboard",
    });
  });
});
