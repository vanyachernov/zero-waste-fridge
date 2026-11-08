import { useI18n } from "@zwf/i18n/react";
import { Logo, LogoMark } from "@zwf/ui";
import { BellRing, ChefHat, Users } from "lucide-react";
import type { ReactNode } from "react";

const BENEFIT_ICONS = [BellRing, ChefHat, Users];

/** Макет «Вхід / Реєстрація»: зелена панель з перевагами (від lg) + форма на світлому фоні. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t, messages } = useI18n();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-on-primary lg:flex xl:p-14">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark className="bg-on-primary/15 text-on-primary ring-1 ring-on-primary/25" />
          <span className="text-base font-bold tracking-tight">{messages.brand.name}</span>
        </span>

        <div className="max-w-md">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance">{t("auth.panelTitle")}</h1>
          <p className="mt-4 text-sm leading-relaxed opacity-85">{t("auth.panelText")}</p>
          <ul className="mt-8 space-y-3">
            {messages.auth.benefits.map((text, i) => {
              const Icon = BENEFIT_ICONS[i] ?? BellRing;
              return (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-on-primary/15 ring-1 ring-on-primary/20">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-2xs opacity-70">{t("auth.footer", { year: new Date().getFullYear() })}</p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-surface-container-low px-4 py-10 sm:px-6">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
