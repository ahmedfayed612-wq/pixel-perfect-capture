// Server-side verification of the founder dashboard password
import { createServerFn } from "@tanstack/react-start";

export const verifyAdminPasswordFn = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string") {
      throw new Error("Password is required");
    }
    return { password: input.password };
  })
  .handler(async ({ data }) => {
    const adminPassword = process.env["ADMIN_PASSWORD"];
    if (!adminPassword) {
      return { ok: false as const, reason: "not_configured" as const };
    }
    return {
      ok: data.password === adminPassword,
      reason: "checked" as const,
    };
  });
