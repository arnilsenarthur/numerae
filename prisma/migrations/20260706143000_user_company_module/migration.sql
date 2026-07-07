-- UserCnpj -> UserCompany (global companies)

CREATE TYPE "CompanyRegistrationKind" AS ENUM ('CNPJ', 'EIN', 'VAT_ID', 'COMPANY_NUMBER', 'OTHER');

ALTER TABLE "UserCnpj" RENAME TO "UserCompany";

ALTER TABLE "UserCompany" RENAME COLUMN "cnpj" TO "registrationId";
ALTER TABLE "UserCompany" RENAME COLUMN "cnaeCode" TO "activityCode";
ALTER TABLE "UserCompany" RENAME COLUMN "cnaeDescription" TO "activityDescription";

ALTER TABLE "UserCompany"
  ADD COLUMN "countryCode" CHAR(2) NOT NULL DEFAULT 'BR',
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "registrationKind" "CompanyRegistrationKind" NOT NULL DEFAULT 'CNPJ';

DROP INDEX "UserCnpj_userId_cnpj_key";

CREATE UNIQUE INDEX "UserCompany_userId_countryCode_registrationId_key"
  ON "UserCompany"("userId", "countryCode", "registrationId");

ALTER INDEX "UserCnpj_userId_idx" RENAME TO "UserCompany_userId_idx";

ALTER TABLE "UserCompany" RENAME CONSTRAINT "UserCnpj_pkey" TO "UserCompany_pkey";
ALTER TABLE "UserCompany" RENAME CONSTRAINT "UserCnpj_userId_fkey" TO "UserCompany_userId_fkey";
