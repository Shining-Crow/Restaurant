export function withPrismaCliParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function migrationDatabaseUrl(): string {
  const raw =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  return raw ? withPrismaCliParams(raw) : "";
}
