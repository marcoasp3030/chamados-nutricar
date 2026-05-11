import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/placeholder",
  },
  // Convenção brasileira: nomes em snake_case já vêm explícitos no schema.
  casing: "snake_case",
} satisfies Config;
