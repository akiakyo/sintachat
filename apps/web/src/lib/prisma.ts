import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

function createClient() {
  const adapter = new PrismaNeon({
    connectionString,
  });

  return new PrismaClient({
    adapter,
    log: [
      {
        emit: "stdout",
        level: "error",
      },
    ],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}