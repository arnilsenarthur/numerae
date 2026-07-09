import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientVersion: number | undefined;
};

/** Bump when schema changes require regenerating the cached dev client. */
const PRISMA_CLIENT_VERSION = 6;

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
  if (globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION) {
    return false;
  }

  return (
    typeof client.country?.findMany === "function" &&
    typeof client.currency?.findMany === "function" &&
    typeof client.institution?.findMany === "function" &&
    typeof client.institutionProduct?.findMany === "function" &&
    typeof client.adminAuditLog?.findMany === "function" &&
    typeof client.userCompany?.findMany === "function" &&
    typeof client.worker?.findMany === "function" &&
    typeof client.financialGoal?.findMany === "function" &&
    typeof client.financialAccount?.findMany === "function" &&
    typeof client.transaction?.findMany === "function" &&
    typeof client.recurringTransaction?.findMany === "function" &&
    typeof client.marketAsset?.findMany === "function" &&
    typeof client.investmentPlan?.findMany === "function" &&
    typeof client.investmentPosition?.findMany === "function" &&
    typeof client.investmentEntry?.findMany === "function" &&
    typeof client.passwordReset?.findMany === "function" &&
    typeof client.tip?.findMany === "function"
  );
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && isClientCurrent(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
  return client;
}

export const prisma = getPrismaClient();
