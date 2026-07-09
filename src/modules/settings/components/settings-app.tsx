"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { IconWrench, IconUser } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { resolveAppLocale, type AppLocale } from "@/i18n/locales";
import { useLocale, useT } from "@/i18n/locale-provider";
import type { SerializedUserPreference } from "@/types/preferences";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real brasileiro" },
  { value: "USD", label: "USD — Dólar americano" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Libra esterlina" },
  { value: "ARS", label: "ARS — Peso argentino" },
];

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
];

export function SettingsApp() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const { setLocale } = useLocale();
  const t = useT();

  // Profile
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileFormRef = useRef<HTMLDivElement>(null);

  const nameField = useValidatedField(
    [
      validationRules.required(t("auth.validation.nameRequired")),
      validationRules.maxLength(100, t("auth.validation.nameMaxLength")),
    ],
    { required: true, validateMode: "change", showSuccess: false },
  );

  useEffect(() => {
    if (session?.user?.name) {
      nameField.setValue(session.user.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name]);

  async function saveProfile() {
    if (!nameField.validation.isValid && nameField.validation.state !== "default") return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { response, data } = await fetchJson<{ error?: string }>("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameField.value }),
      });
      if (!response.ok) throw new Error((data as { error?: string })?.error ?? t("settings.saveError"));
      await updateSession();
      toast(t("settings.profileSaved"), "success");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t("settings.profileSaveError"));
    } finally {
      setProfileSaving(false);
    }
  }

  // Preferences
  const [prefDraft, setPrefDraft] = useState<SerializedUserPreference | null>(null);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  useEffect(() => {
    void fetchJson<{ preference?: SerializedUserPreference }>("/api/user/preferences").then(
      (res) => {
        if (res.response.ok) {
          const pref = res.data?.preference ?? null;
          setPrefDraft(pref);
          if (pref?.language) setLocale(resolveAppLocale(pref.language));
        }
      },
    );
  }, []);

  async function savePreferences() {
    if (!prefDraft) return;
    setPrefSaving(true);
    setPrefError(null);
    try {
      const { response, data } = await fetchJson<{ preference?: SerializedUserPreference; error?: string }>(
        "/api/user/preferences",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showDailyTip: prefDraft.showDailyTip,
            defaultCurrency: prefDraft.defaultCurrency,
            language: prefDraft.language,
          }),
        },
      );
      if (!response.ok) throw new Error((data as { error?: string })?.error ?? t("settings.saveError"));
      if (data?.preference) {
        setPrefDraft(data.preference);
        setLocale(resolveAppLocale(data.preference.language) as AppLocale);
      }
      toast(t("settings.preferencesSaved"), "success");
    } catch (err) {
      setPrefError(err instanceof Error ? err.message : t("settings.preferencesSaveError"));
    } finally {
      setPrefSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4">
      <PageHeader
        meta={{
          kicker: t("settings.kicker"),
          title: t("settings.title"),
          subtitle: t("settings.subtitle"),
        }}
      />

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUser size="sm" /> {t("settings.profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profileError ? <Alert variant="error">{profileError}</Alert> : null}
          <div ref={profileFormRef} className="space-y-3">
            <Field
              label={t("settings.name")}
              message={nameField.validation.message}
              state={nameField.validation.state}
              required
            >
              <Input
                value={nameField.value}
                onChange={(e) => nameField.setValue(e.target.value)}
                onBlur={nameField.bind.onBlur}
                placeholder={t("settings.namePlaceholder")}
                {...fieldControlProps(nameField.validation.state)}
              />
            </Field>
            <Field label={t("common.email")}>
              <Input
                value={session?.user?.email ?? ""}
                readOnly
                disabled
                className="cursor-default opacity-60"
              />
            </Field>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void saveProfile()}
            disabled={profileSaving}
          >
            {profileSaving ? "…" : t("settings.saveProfile")}
          </Button>
        </CardContent>
      </Card>

      {/* Preferências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconWrench size="sm" /> {t("settings.preferences")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefError ? <Alert variant="error">{prefError}</Alert> : null}
          {prefDraft ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t("settings.showDailyTip")}</p>
                  <p className="text-xs text-zinc-500">{t("settings.showDailyTipHint")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefDraft.showDailyTip}
                  onClick={() =>
                    setPrefDraft((p) => (p ? { ...p, showDailyTip: !p.showDailyTip } : p))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${prefDraft.showDailyTip ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${prefDraft.showDailyTip ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div className="space-y-1">
                <Label>{t("settings.defaultCurrency")}</Label>
                <Select
                  options={CURRENCY_OPTIONS}
                  value={prefDraft.defaultCurrency}
                  onChange={(value) =>
                    setPrefDraft((p) => (p ? { ...p, defaultCurrency: value } : p))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>{t("settings.language")}</Label>
                <Select
                  options={LANGUAGE_OPTIONS}
                  value={prefDraft.language}
                  onChange={(value) =>
                    setPrefDraft((p) => (p ? { ...p, language: value } : p))
                  }
                />
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => void savePreferences()}
                disabled={prefSaving}
              >
                {prefSaving ? "…" : t("settings.savePreferences")}
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-8 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
