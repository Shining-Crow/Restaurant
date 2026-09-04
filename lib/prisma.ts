import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { Pool } from "pg";

declare global {
  var prismaSingleton: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

export function getPrisma(): PrismaClient {
  if (globalThis.prismaSingleton) return globalThis.prismaSingleton;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = globalThis.prismaPool ?? new Pool({ connectionString });
  globalThis.prismaPool = pool;

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  globalThis.prismaSingleton = client;
  return client;
}
