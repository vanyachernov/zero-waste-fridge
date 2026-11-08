import { useI18n } from "@zwf/i18n/react";
import { Input, type InputProps } from "@zwf/ui";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

/** Поле пароля з іконкою замка та кнопкою «показати / сховати». */
export function PasswordInput(props: Omit<InputProps, "type" | "leading" | "trailing">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      leading={<Lock className="size-4" aria-hidden />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
          aria-controls={props.id}
          className="-mr-1 flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted hover:text-on-surface"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
