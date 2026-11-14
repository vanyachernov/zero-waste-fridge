import { useMutation } from "@tanstack/react-query";
import { api, DEMO_ACCOUNT, isApiError, isMockApi, type CurrentUser } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Checkbox, Field, Input, fieldMessageId } from "@zwf/ui";
import { Loader2, Mail } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { errorMessage, fieldMessage, serverFieldErrors } from "../lib/errors";
import { FormAlert } from "./FormAlert";
import { PasswordInput } from "./PasswordInput";
import { hasErrors, validateEmail, validateLoginPassword } from "./validation";

const FIELDS = ["email", "password"] as const;
type LoginField = (typeof FIELDS)[number];

export interface LoginFormProps {
  onSuccess: (user: CurrentUser) => void;
  /** Посилання «Забули пароль?» біля підпису поля (F-13); отримує поточний email, щоб передати його далі. */
  forgotLink?: (email: string) => ReactNode;
  initialEmail?: string;
}

export function LoginForm({ onSuccess, forgotLink, initialEmail = "" }: LoginFormProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<LoginField, string | null>>>({});

  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess,
    onError: (error) => setErrors(serverFieldErrors(error, FIELDS)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { email: validateEmail(email), password: validateLoginPassword(password) };
    setErrors(next);
    if (hasErrors(next)) return;
    login.mutate({ email: email.trim(), password, rememberMe });
  };

  // Помилки полів показуємо біля полів; загальну (неправильний пароль, мережа) — над кнопкою
  const formError = login.isError && !hasErrors(serverFieldErrors(login.error, FIELDS)) ? errorMessage(login.error, i18n) : null;
  const invalidCredentials = isApiError(login.error, 401);

  return (
    <div id="auth-panel-login" role="tabpanel" aria-labelledby="auth-tab-login">
      {/* F-91: role="tabpanel" на <form> недопустима — панель обгортає форму */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t("auth.email")} htmlFor="login-email" error={fieldMessage(errors.email, i18n)}>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            invalid={!!errors.email || invalidCredentials}
            aria-describedby={errors.email ? fieldMessageId("login-email") : undefined}
            leading={<Mail className="size-4" aria-hidden />}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={t("auth.password")} htmlFor="login-password" error={fieldMessage(errors.password, i18n)} labelAside={forgotLink?.(email.trim())}>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            invalid={!!errors.password || invalidCredentials}
            aria-describedby={errors.password ? fieldMessageId("login-password") : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-on-surface">
          <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          {t("auth.remember")}
        </label>

        <FormAlert message={formError} />

        <Button type="submit" size="lg" className="w-full" disabled={login.isPending} aria-busy={login.isPending}>
          {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("auth.login")}
        </Button>

        {isMockApi() && (
          <button
            type="button"
            className="cursor-pointer text-2xs text-muted underline-offset-2 hover:text-primary hover:underline"
            onClick={() => {
              setEmail(DEMO_ACCOUNT.email);
              setPassword(DEMO_ACCOUNT.password);
            }}
          >
            {t("auth.demo", DEMO_ACCOUNT)}
          </button>
        )}
      </form>
    </div>
  );
}
