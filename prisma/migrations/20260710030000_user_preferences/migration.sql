-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "showDailyTip" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" VARCHAR(8) NOT NULL DEFAULT 'BRL',
    "language" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
