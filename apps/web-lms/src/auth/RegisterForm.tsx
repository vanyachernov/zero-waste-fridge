import { useMutation } from "@tanstack/react-query";
import { api, type CurrentUser } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Field, Input, fieldMessageId } from "@zwf/ui";
import { Loader2, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { errorMessage, fieldMessage, serverFieldErrors } from "../lib/errors";
import { FormAlert } from "./FormAlert";
import { PasswordInput } from "./PasswordInput";
import { hasErrors, validateEmail, validateName, validateNewPassword } from "./validation";

const FIELDS = ["name", "email", "password"] as const;
type RegisterField = (typeof FIELDS)[number];

export function RegisterForm({ onSuccess }: { onSuccess: (user: CurrentUser) => void }) {
  const i18n = useI18n();
  const { t } = i18n;
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string | null>>>({});

  const register = useMutation({
    mutationFn: api.auth.register,
    onSuccess,
    onError: (error) => setErrors(serverFieldErrors(error, FIELDS)),
  });

  const set = (field: RegisterField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { name: validateName(values.name), email: validateEmail(values.email), password: validateNewPassword(values.password) };
    setErrors(next);
    if (hasErrors(next)) return;
    register.mutate({ name: values.name.trim(), email: values.email.trim(), password: values.password, rememberMe: true });
  };

  const formError = register.isError && !hasErrors(serverFieldErrors(register.error, FIELDS)) ? errorMessage(register.error, i18n) : null;
  const describedBy = (field: RegisterField, id: string, withHint = false) =>
    errors[field] || withHint ? fieldMessageId(id) : undefined;

  return (
    <div id="auth-panel-register" role="tabpanel" aria-labelledby="auth-tab-register">
      {/* F-91: role="tabpanel" на <form> недопустима — панель обгортає форму */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t("auth.name")} htmlFor="register-name" error={fieldMessage(errors.name, i18n)}>
          <Input
            id="register-name"
            autoComplete="name"
            autoFocus
            placeholder={t("auth.namePlaceholder")}
            value={values.name}
            invalid={!!errors.name}
            aria-describedby={describedBy("name", "register-name")}
            leading={<UserRound className="size-4" aria-hidden />}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <Field label={t("auth.email")} htmlFor="register-email" error={fieldMessage(errors.email, i18n)}>
          <Input
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={values.email}
            invalid={!!errors.email}
            aria-describedby={describedBy("email", "register-email")}
            leading={<Mail className="size-4" aria-hidden />}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>

        <Field label={t("auth.password")} htmlFor="register-password" hint={t("auth.passwordHint")} error={fieldMessage(errors.password, i18n)}>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            value={values.password}
            invalid={!!errors.password}
            aria-describedby={describedBy("password", "register-password", true)}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>

        <FormAlert message={formError} />

        <Button type="submit" size="lg" className="w-full" disabled={register.isPending} aria-busy={register.isPending}>
          {register.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("auth.register")}
        </Button>

        <p className="text-center text-2xs text-muted">{t("auth.terms")}</p>
      </form>
    </div>
  );
}
