import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  out: "./drizzle", // onde ficam os .sql de migração
  dialect: "postgresql",
  schema: "./server/src/schema.ts", // <— aqui
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
