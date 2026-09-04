import * as z from "zod";

export const checkoutLineSchema = z.object({
  id: z.number().int().positive(),
  qty: z.number().int().positive().max(99),
});

export const customerDetailsSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(6).max(40),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  address: z.string().max(500).optional(),
  time: z.string().min(1, "Preferred time is required").max(120),
  notes: z.string().max(2000).optional(),
});

export const createPaymentBodySchema = z.object({
  lines: z.array(checkoutLineSchema).min(1).max(80),
  orderType: z.enum(["collection", "delivery"]),
  customerDetails: customerDetailsSchema,
});

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
