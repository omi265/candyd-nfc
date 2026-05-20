import { db } from './lib/db';

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
