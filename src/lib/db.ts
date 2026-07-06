import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/** Dev server keeps a global client; recreate after schema/migrate changes. */
function isClientCurrent(client: PrismaClient) {
  return (
    typeof client.country?.findMany === "function" &&
    typeof client.currency?.findMany === "function" &&
    typeof client.institution?.findMany === "function" &&
    typeof client.institutionProduct?.findMany === "function" &&
    typeof client.adminAuditLog?.findMany === "function" &&
    typeof client.worker?.findMany === "function" &&
    typeof client.moneyMap?.findMany === "function"
  );
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && isClientCurrent(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
