import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:bOPEsdNyBslYOYEBfuFoKuflFlfHUzNr@sakura.proxy.rlwy.net:10531/railway",
  },
});
