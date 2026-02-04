import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

declare global {
  var prisma: PrismaClient | undefined;
  var pgPool: Pool | undefined;
}

const pool = global.pgPool || new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Force a new instance if we're in development to ensure new models like SupportTicket are loaded
export const db = (process.env.NODE_ENV === "development") 
  ? new PrismaClient({ adapter }) 
  : (global.prisma || new PrismaClient({ adapter }));

if (process.env.NODE_ENV !== "production") {
    global.prisma = db;
    global.pgPool = pool;
}

// Force reload for new models
