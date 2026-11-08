import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { queryKeys, type CurrentUser } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button } from "@zwf/ui";
import { Info, Users } from "lucide-react";
import { useState } from "react";
import { safeRedirect } from "../lib/redirect";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { AuthLayout } from "./AuthLayout";
import { AuthTabs, type AuthTab } from "./AuthTabs";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const route = getRouteApi("/login");

/** F-10: макет «Вхід / Реєстрація». Вкладка — у URL (`?tab=register`), щоб на неї можна було дати посилання. */
export function LoginPage() {
  const { t } = useI18n();
  const { tab = "login", redirect } = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [joinNotice, setJoinNotice] = useState(false);
  useDocumentTitle(tab === "login" ? t("auth.tabLogin") : t("auth.tabRegister"));

  const onAuthenticated = (user: CurrentUser) => {
    queryClient.setQueryData(queryKeys.me, user);
    // F-11: назад на сторінку, з якої guard відправив на вхід
    void navigate({ href: safeRedirect(redirect), replace: true });
  };

  const setTab = (next: AuthTab) => navigate({ search: (prev) => ({ ...prev, tab: next === "login" ? undefined : next }), replace: true });

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <AuthTabs value={tab} onChange={setTab} labels={{ login: t("auth.tabLogin"), register: t("auth.tabRegister") }} />

        <header>
          <h2 className="text-2xl font-extrabold tracking-tight">{tab === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{tab === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}</p>
        </header>

        {tab === "login" ? <LoginForm onSuccess={onAuthenticated} /> : <RegisterForm onSuccess={onAuthenticated} />}

        <div className="flex items-center gap-3 text-2xs text-muted" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full" aria-expanded={joinNotice} onClick={() => setJoinNotice((v) => !v)}>
            <Users className="size-4" aria-hidden /> {t("auth.joinCode")}
          </Button>
          {joinNotice && (
            <p role="status" className="rounded-md bg-caution-container px-3 py-2 text-2xs text-on-caution-container">
              {t("auth.joinSoon")}
            </p>
          )}
          <p className="flex gap-2 rounded-lg bg-secondary-container p-3 text-2xs text-on-secondary-container">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {t("auth.joinInfo")}
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
