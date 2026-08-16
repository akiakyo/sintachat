import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Neon recommends a direct (non-pooler) URL for migrate/db push.
    // Runtime queries still use DATABASE_URL in src/lib/prisma.ts.
    url: process.env.DIRECT_URL || env("DATABASE_URL")
  }
});
