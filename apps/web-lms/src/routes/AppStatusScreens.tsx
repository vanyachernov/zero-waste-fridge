import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useI18n } from "@zwf/i18n/react";
import { Button, Card, LogoMark, buttonClasses } from "@zwf/ui";
import { CircleAlert, Loader2, RefreshCw, SearchX } from "lucide-react";
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

/** F-92: помилка всередині розділу — шапка й навігація лишаються, падає лише вміст. */
export function RouteErrorScreen({ error, reset }: ErrorComponentProps) {
  const i18n = useI18n();
  const router = useRouter();
  return (
    <Card role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <CircleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="text-lg font-bold">{i18n.t("common.error")}</h1>
      <p className="text-sm text-on-surface-variant">{i18n.t("status.routeErrorText")}</p>
      <p className="text-2xs text-muted">{errorMessage(error, i18n)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
        >
          <RefreshCw className="size-4" aria-hidden /> {i18n.t("common.retry")}
        </Button>
        <Link to="/" className={buttonClasses("primary", "md")}>
          {i18n.t("status.toFridge")}
        </Link>
      </div>
    </Card>
  );
}

/** F-92: 404 у SPA — невідома адреса під `/lms/…`. */
export function NotFoundScreen() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-10" />
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-extrabold">{t("status.notFoundTitle")}</h1>
      <p className="max-w-sm text-sm text-on-surface-variant">{t("status.notFoundText")}</p>
      <Link to="/" className={buttonClasses("primary", "md")}>
        {t("status.toFridge")}
      </Link>
    </div>
  );
}
