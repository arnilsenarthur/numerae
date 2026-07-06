export function maskEmail(email: string): string {
  const [local, domainPart] = email.split("@");
  if (!local || !domainPart) return "••••";

  const dotIndex = domainPart.lastIndexOf(".");
  const domainName =
    dotIndex > 0 ? domainPart.slice(0, dotIndex) : domainPart;
  const tld = dotIndex > 0 ? domainPart.slice(dotIndex) : "";

  const maskedLocal =
    local.length <= 1
      ? "•"
      : `${local[0]}${"•".repeat(Math.min(local.length - 1, 5))}`;

  const maskedDomain =
    domainName.length <= 1
      ? "•"
      : `${domainName[0]}${"•".repeat(Math.min(domainName.length - 1, 4))}`;

  return `${maskedLocal}@${maskedDomain}${tld ? tld.replace(/./g, "•") : ""}`;
}
