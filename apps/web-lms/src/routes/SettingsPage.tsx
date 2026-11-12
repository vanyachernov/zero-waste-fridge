import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError, queryKeys, type NotificationSettings } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Card, Field, Input, Select, Switch, useToast } from "@zwf/ui";
import { BellRing, Moon, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { FormAlert } from "../auth/FormAlert";
import { errorMessage, fieldMessage } from "../lib/errors";
import { disablePush, enablePush, PushError, pushSupported } from "../lib/push";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h));

/** F-71 + I-60: `/lms/settings` — канали, час листа, тиха година, дозвіл на push (B-34, B-33). */
export function SettingsPage() {
  const i18n = useI18n();
  const { t } = i18n;
  useDocumentTitle(t("settings.title"));
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: queryKeys.notificationSettings, queryFn: () => api.notifications.settings() });
  const publicKey = useQuery({ queryKey: ["push", "public-key"], queryFn: () => api.notifications.pushPublicKey(), staleTime: Infinity });
  const [form, setForm] = useState<NotificationSettings | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: async (next: NotificationSettings) => {
      // Push: спершу дозвіл і підписка браузера — без них вмикати канал немає сенсу
      if (next.push && !settings.data?.push) await enablePush();
      if (!next.push && settings.data?.push) await disablePush().catch(() => undefined);
      return api.notifications.saveSettings(next);
    },
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.notificationSettings, saved);
      setForm(saved);
      setPushError(null);
      toast.show({ message: t("settings.saved"), tone: "success" });
    },
    onError: (error) => {
      if (error instanceof PushError) {
        setPushError(t(error.reason === "unsupported" ? "settings.pushUnsupported" : error.reason === "denied" ? "settings.pushDenied" : "settings.pushUnavailable"));
      }
    },
  });

  if (!form) {
    return <p className="text-sm text-muted">{settings.isError ? errorMessage(settings.error, i18n) : t("common.loading")}</p>;
  }

  const set = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const fieldError = (field: string) => (isApiError(save.error) ? fieldMessage(save.error.fieldErrors[field], i18n) : undefined);
  const pushAvailable = pushSupported() && Boolean(publicKey.data?.publicKey);
  const hourOptions = HOURS.map((h) => ({ value: h, label: t("settings.hour", { h: h.padStart(2, "0") }) }));
  const general = save.isError && !(save.error instanceof PushError) && !Object.keys(isApiError(save.error) ? save.error.fieldErrors : {}).length ? errorMessage(save.error, i18n) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <nav aria-label="Breadcrumb" className="text-2xs text-on-surface-variant">
          <span className="font-bold">{t("settings.breadcrumbRoot")}</span> › <span className="text-primary">{t("settings.title")}</span>
        </nav>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-display">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("settings.subtitle")}</p>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
        noValidate
      >
        <FormAlert message={general} />
        <Card className="flex flex-col gap-5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BellRing className="size-5 text-primary" aria-hidden /> {t("settings.channels")}
          </h2>
          <Switch checked={form.inApp} onChange={(v) => set("inApp", v)} label={t("settings.inApp")} description={t("settings.inAppHint")} />
          <Switch checked={form.emailDigest} onChange={(v) => set("emailDigest", v)} label={t("settings.emailDigest")} description={t("settings.emailDigestHint")} />
          {form.emailDigest && (
            <Field label={t("settings.digestTime")} error={fieldError("digestTime")} htmlFor="digest-time" className="pl-[52px] sm:max-w-60">
              <Input
                id="digest-time"
                type="time"
                step={60}
                required
                value={form.digestTime}
                invalid={Boolean(fieldError("digestTime"))}
                onChange={(e) => set("digestTime", e.target.value)}
              />
            </Field>
          )}
          <Switch
            checked={form.push}
            onChange={(v) => set("push", v)}
            disabled={!pushAvailable && !form.push}
            label={t("settings.push")}
            description={!pushSupported() ? t("settings.pushUnsupported") : publicKey.data && !publicKey.data.publicKey ? t("settings.pushUnavailable") : t("settings.pushHint")}
          />
          {pushError && (
            <p role="alert" className="pl-[52px] text-xs font-medium text-error">
              {pushError}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Moon className="size-5 text-primary" aria-hidden /> {t("settings.quiet")}
          </h2>
          <Switch
            checked={form.quietHours !== null}
            onChange={(on) => set("quietHours", on ? { from: 22, to: 7 } : null)}
            label={t("settings.quiet")}
            description={t("settings.quietHint")}
          />
          {form.quietHours && (
            <div className="grid grid-cols-2 gap-4 pl-[52px] sm:max-w-md">
              <Field label={t("settings.quietFrom")} error={fieldError("quietHours.from")} htmlFor="quiet-from">
                <Select id="quiet-from" value={String(form.quietHours.from)} onChange={(h) => set("quietHours", { ...form.quietHours!, from: Number(h) })} options={hourOptions} />
              </Field>
              <Field label={t("settings.quietTo")} error={fieldError("quietHours.to")} htmlFor="quiet-to">
                <Select id="quiet-to" value={String(form.quietHours.to)} onChange={(h) => set("quietHours", { ...form.quietHours!, to: Number(h) })} options={hourOptions} />
              </Field>
            </div>
          )}
        </Card>

        <Button type="submit" className="self-end" disabled={save.isPending}>
          <Save className="size-4" /> {t("settings.save")}
        </Button>
      </form>
    </div>
  );
}
