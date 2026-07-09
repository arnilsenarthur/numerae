CREATE TABLE "CurrencyQuote" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "usdRate" DECIMAL(18,8) NOT NULL,
    "quotedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurrencyQuote_currencyId_quotedAt_key" ON "CurrencyQuote"("currencyId", "quotedAt");
CREATE INDEX "CurrencyQuote_currencyId_quotedAt_idx" ON "CurrencyQuote"("currencyId", "quotedAt");

ALTER TABLE "CurrencyQuote" ADD CONSTRAINT "CurrencyQuote_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
