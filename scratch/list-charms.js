require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const db = prismaClientSingleton();

async function listCharms() {
  try {
    const products = await db.product.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        token: true
      }
    });
    console.log('CHARMS_LIST_START');
    console.log(JSON.stringify(products, null, 2));
    console.log('CHARMS_LIST_END');
  } catch (error) {
    console.error('Error listing charms:', error);
  } finally {
    await db.$disconnect();
  }
}

listCharms();
