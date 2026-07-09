import { PrismaClient } from "../src/generated/prisma/client/index.js";

const prisma = new PrismaClient();
const result = await prisma.worker.updateMany({
  where: { id: "market_quotes" },
  data: { runningSince: null },
});
console.log(`Cleared runningSince for ${result.count} worker(s).`);
await prisma.$disconnect();
