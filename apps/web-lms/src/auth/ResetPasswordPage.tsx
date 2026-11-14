import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { api, isApiError } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Field, buttonClasses, fieldMessageId } from "@zwf/ui";
import { CircleCheck, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { errorMessage, fieldMessage, serverFieldErrors } from "../lib/errors";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { AuthLayout } from "./AuthLayout";
import { FormAlert } from "./FormAlert";
import { PasswordInput } from "./PasswordInput";
import { hasErrors, validateNewPassword, validatePasswordConfirmation } from "./validation";

const route = getRouteApi("/reset-password");

/** F-13: сторінка з листа B-06 — `/lms/reset-password?token=…`. */
export function ResetPasswordPage() {
  const i18n = useI18n();
  const { t } = i18n;
  useDocumentTitle(t("auth.resetTitle"));
  const { token } = route.useSearch();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<{ password?: string | null; confirmation?: string | null }>({});

  const reset = useMutation({
    mutationFn: (newPassword: string) => api.auth.resetPassword({ token: token!, password: newPassword }),
    // Бекенд завершив усі сесії користувача — локальний кеш (профіль, продукти) більше не дійсний
    onSuccess: () => queryClient.clear(),
    onError: (error) => setErrors(serverFieldErrors(error, ["password"] as const)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { password: validateNewPassword(password), confirmation: validatePasswordConfirmation(password, confirmation) };
    setErrors(next);
    if (!hasErrors(next)) reset.mutate(password);
  };

  const requestNew = (
    <Link to="/forgot-password" className={buttonClasses("outline", "md", "w-full")}>
      {t("auth.requestNewLink")}
    </Link>
  );

  if (!token) {
    return (
      <AuthLayout>
        <StatusBlock icon={<TriangleAlert className="size-6" aria-hidden />} tone="error" title={t("auth.resetTitle")} text={t("auth.resetNoToken")}>
          {requestNew}
        </StatusBlock>
      </AuthLayout>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthLayout>
        <StatusBlock icon={<CircleCheck className="size-6" aria-hidden />} tone="success" title={t("auth.resetDoneTitle")} text={t("auth.resetDone")}>
          <Link to="/login" replace className={buttonClasses("primary", "lg", "w-full")}>
            {t("auth.login")}
          </Link>
        </StatusBlock>
      </AuthLayout>
    );
  }

  const invalidToken = isApiError(reset.error) && reset.error.code === "INVALID_RESET_TOKEN";
  const formError = reset.isError && !serverFieldErrors(reset.error, ["password"] as const).password ? errorMessage(reset.error, i18n) : null;

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <header>
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">{t("auth.resetTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("auth.resetSubtitle")}</p>
        </header>

        <Field label={t("auth.newPassword")} htmlFor="reset-password" hint={t("auth.passwordHint")} error={fieldMessage(errors.password, i18n)}>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            autoFocus
            value={password}
            invalid={!!errors.password}
            aria-describedby={fieldMessageId("reset-password")}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label={t("auth.confirmPassword")} htmlFor="reset-confirmation" error={fieldMessage(errors.confirmation, i18n)}>
          <PasswordInput
            id="reset-confirmation"
            autoComplete="new-password"
            value={confirmation}
            invalid={!!errors.confirmation}
            aria-describedby={errors.confirmation ? fieldMessageId("reset-confirmation") : undefined}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </Field>

        <FormAlert message={formError} />
        {invalidToken && requestNew}

        <Button type="submit" size="lg" className="w-full" disabled={reset.isPending} aria-busy={reset.isPending}>
          {reset.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("auth.resetSubmit")}
        </Button>
      </form>
    </AuthLayout>
  );
}

function StatusBlock({ icon, tone, title, text, children }: { icon: React.ReactNode; tone: "success" | "error"; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5" role={tone === "error" ? "alert" : "status"}>
      <span
        className={
          tone === "success"
            ? "flex size-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"
            : "flex size-12 items-center justify-center rounded-xl bg-error-container text-on-error-container"
        }
      >
        {icon}
      </span>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{text}</p>
      </div>
      {children}
    </div>
  );
}
