import * as z from "zod";

const menuCategorySchema = z.enum([
  "starters",
  "pasta",
  "pizza",
  "chicken",
  "risotto",
  "crespelle",
  "burgers",
  "bread",
  "sides",
  "kids",
]);

const tagSchema = z.enum(["v", "vg", "gf", "sp"]);

export const createMenuItemBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    desc: z.string().min(1).max(8000),
    price: z.number().finite().positive().max(500),
    cat: menuCategorySchema,
    tags: z.array(tagSchema).max(8).optional().default([]),
    available: z.boolean().optional().default(true),
    popular: z.boolean().optional().default(false),
    img: z.string().max(2000).optional().default(""),
    extras: z.string().max(8000).optional().default(""),
    sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  })
  .strict();

export const patchMenuItemBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    desc: z.string().min(1).max(8000).optional(),
    price: z.number().finite().positive().max(500).optional(),
    cat: menuCategorySchema.optional(),
    tags: z.array(tagSchema).max(8).optional(),
    available: z.boolean().optional(),
    popular: z.boolean().optional(),
    img: z.string().max(2000).optional(),
    extras: z.string().max(8000).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .strict();
