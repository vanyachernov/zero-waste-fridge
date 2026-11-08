import { useMutation } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { api, isMockApi, mockAuthControl } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Field, Input, buttonClasses, fieldMessageId } from "@zwf/ui";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { errorMessage, fieldMessage, serverFieldErrors } from "../lib/errors";
import { useCountdown } from "../lib/useCountdown";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";
import { validateEmail } from "./validation";

const route = getRouteApi("/forgot-password");

/** Бекенд надсилає не більше одного листа на хвилину (B-06) — UI не дає «спамити» кнопкою. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** F-13: «Забули пароль?» — запит посилання на email. */
export function ForgotPasswordPage() {
  const i18n = useI18n();
  const { t } = i18n;
  useDocumentTitle(t("auth.forgotTitle"));
  const search = route.useSearch();
  const [email, setEmail] = useState(search.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, startCooldown] = useCountdown();

  const request = useMutation({
    mutationFn: (value: string) => api.auth.forgotPassword(value),
    onSuccess: (_, value) => {
      setSentTo(value);
      startCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => setEmailError(serverFieldErrors(error, ["email"] as const).email ?? null),
  });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const error = validateEmail(email);
    setEmailError(error);
    if (!error) request.mutate(email.trim());
  };

  const formError = request.isError && !serverFieldErrors(request.error, ["email"] as const).email ? errorMessage(request.error, i18n) : null;
  const backToLogin = (
    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> {t("auth.backToLogin")}
    </Link>
  );

  if (sentTo) {
    const demoLink = isMockApi() ? mockAuthControl.lastResetLink() : null;
    return (
      <AuthLayout>
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{t("auth.forgotSentTitle")}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{t("auth.forgotSent", { email: sentTo })}</p>
          </div>
          <Button variant="outline" className="w-full" disabled={cooldown > 0 || request.isPending} onClick={() => request.mutate(sentTo)}>
            {request.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {cooldown > 0 ? t("auth.forgotResendIn", { seconds: cooldown }) : t("auth.forgotResend")}
          </Button>
          {demoLink && (
            <a href={demoLink} className={buttonClasses("secondary", "md", "w-full")}>
              {t("auth.demoMail")}
            </a>
          )}
          {backToLogin}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <header>
          <h2 className="text-2xl font-extrabold tracking-tight">{t("auth.forgotTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("auth.forgotSubtitle")}</p>
        </header>
        <Field label={t("auth.email")} htmlFor="forgot-email" error={fieldMessage(emailError, i18n)}>
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            invalid={!!emailError}
            aria-describedby={emailError ? fieldMessageId("forgot-email") : undefined}
            leading={<Mail className="size-4" aria-hidden />}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <FormAlert message={formError} />
        <Button type="submit" size="lg" className="w-full" disabled={request.isPending} aria-busy={request.isPending}>
          {request.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("auth.forgotSubmit")}
        </Button>
        {backToLogin}
      </form>
    </AuthLayout>
  );
}
