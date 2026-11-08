import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useI18n } from "@zwf/i18n/react";
import { Button, LogoMark } from "@zwf/ui";
import { Loader2, RefreshCw } from "lucide-react";
import { errorMessage } from "../lib/errors";

/** Поки перевіряємо сесію (`/api/auth/me`) перед входом у кабінет. */
export function AppPendingScreen() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <LogoMark className="size-10" />
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

/** Не вдалося завантажити кабінет (сервер недоступний / 5xx) — 401 сюди не потрапляє, його обробляє guard. */
export function AppErrorScreen({ error }: ErrorComponentProps) {
  const i18n = useI18n();
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <LogoMark className="size-10" />
      <h1 className="text-lg font-bold">{i18n.t("common.error")}</h1>
      <p className="max-w-sm text-sm text-on-surface-variant">{errorMessage(error, i18n)}</p>
      <Button variant="outline" onClick={() => void router.invalidate()}>
        <RefreshCw className="size-4" aria-hidden /> {i18n.t("common.retry")}
      </Button>
    </div>
  );
}
