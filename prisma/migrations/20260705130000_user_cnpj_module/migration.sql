-- AlterTable
ALTER TABLE "User" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'BR';

-- CreateTable
CREATE TABLE "UserCnpj" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cnaeCode" TEXT,
    "cnaeDescription" TEXT,
    "taxRegime" TEXT NOT NULL DEFAULT 'simples',
    "taxRate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCnpj_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCnpj_userId_cnpj_key" ON "UserCnpj"("userId", "cnpj");

-- CreateIndex
CREATE INDEX "UserCnpj_userId_idx" ON "UserCnpj"("userId");

-- AddForeignKey
ALTER TABLE "UserCnpj" ADD CONSTRAINT "UserCnpj_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
