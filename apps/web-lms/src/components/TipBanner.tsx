import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@zwf/i18n/react";
import { Button } from "@zwf/ui";
import { Lightbulb, X } from "lucide-react";
import { useState } from "react";
import { tipQuery } from "../lib/queries";

const DISMISSED_KEY = "zwf.tip.dismissed";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/** «Ані з ані» — список назв для речення: «Шпинат, Йогурт та Сир». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} та ${names.at(-1)}`;
}

/** B-15 / F-20: «Розумна порада дня». Закрита порада не з'являється до наступного дня. */
export function TipBanner() {
  const { t, messages } = useI18n();
  const navigate = useNavigate();
  const { data: tip } = useQuery(tipQuery);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!tip || dismissed === tip.date || (tip.kind !== "USE_SOON" && tip.kind !== "EXPIRED")) return null;

  const names = joinNames(tip.products.map((p) => p.name));
  const many = tip.products.length > 1;
  const text =
    tip.kind === "USE_SOON"
      ? t("fridge.tipUseSoon", { products: names, verb: t(many ? "fridge.tipVerbMany" : "fridge.tipVerbOne"), hint: tip.hint ? messages.fridge.tipHints[tip.hint] : "" })
      : t("fridge.tipExpired", { products: names, verb: t(many ? "fridge.tipExpiredMany" : "fridge.tipExpiredOne") });

  const dismiss = () => {
    setDismissed(tip.date);
    try {
      localStorage.setItem(DISMISSED_KEY, tip.date);
    } catch {
      /* без сховища порада просто повернеться після перезавантаження */
    }
  };

  return (
    <section
      aria-label={t("fridge.tipLabel")}
      className="flex flex-col gap-3 rounded-xl bg-secondary-container px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container-lowest text-on-warning-container shadow-card">
          <Lightbulb className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-2xs font-bold tracking-wide text-on-warning-container uppercase">{t("fridge.tipLabel")}</p>
          <p className="text-sm text-on-secondary-container">{text}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {tip.kind === "USE_SOON" ? (
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/recipes", search: { ids: tip.products.map((p) => p.id) } })}>
            {t("fridge.tipCta")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/", search: { freshness: ["expired"] } })}>
            {t("fridge.tipWriteOff")}
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label={t("fridge.tipClose")} onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </section>
  );
}
