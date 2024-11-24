import { z } from "zod";

export const emailScheme = z.object({
  email: z
    .string()
    .email({ message: "Invalid email address, please check and try again" }),
});

export const otpScheme = z
  .object({
    otp: z.string().min(6, {
      message: "Your one-time password must be 6 characters.",
    }),
  })
  .merge(emailScheme);

export const messageScheme = z.object({
  message: z.string().min(1, { message: "Message cannot by empty" }),
  image: z.string().optional(),
});
