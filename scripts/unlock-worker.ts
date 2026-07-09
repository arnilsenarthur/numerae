import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const result = await prisma.worker.updateMany({
    where: { id: "market_quotes" },
    data: { runningSince: null },
  });
  console.log(`Cleared runningSince for ${result.count} worker(s).`);
  await prisma.$disconnect();
}

main().catch(console.error);
