import { Loader } from "@/components/ui/loader";
import { createTranslator } from "@/i18n/translate";
import { DEFAULT_LOCALE } from "@/i18n/locales";

export function AuthFormFallback() {
  const t = createTranslator(DEFAULT_LOCALE);
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Loader label={t("common.loading")} />
    </div>
  );
}
