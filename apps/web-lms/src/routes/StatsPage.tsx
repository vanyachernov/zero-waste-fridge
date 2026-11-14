import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { StatsOverview } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Avatar, Button, Card, Select, cn } from "@zwf/ui";
import { BarChart3, Leaf, Recycle, RefreshCw, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { statsOverviewQuery } from "../lib/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const route = getRouteApi("/_authenticated/stats");
export const STATS_PERIODS = [3, 6, 12] as const;
/** Середній легковик — ~0,17 кг CO₂e на км. */
const CO2_PER_KM = 0.17;

/** B-200 / F-200: «Статистика & Екологія». */
export function StatsPage() {
  const i18n = useI18n();
  const { t } = i18n;
  useDocumentTitle(t("stats.title"));
  const { months = 6 } = route.useSearch();
  const navigate = route.useNavigate();
  const stats = useQuery(statsOverviewQuery(months));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="hidden text-2xs text-on-surface-variant sm:block">
            <span className="font-bold">{t("stats.breadcrumbRoot")}</span> › <span className="text-primary">{t("stats.title")}</span>
          </nav>
          <h1 className="text-2xl font-extrabold tracking-tight sm:mt-1 sm:text-display">{t("stats.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{t("stats.subtitle")}</p>
        </div>
        <Select
          aria-label={t("stats.period")}
          className="sm:w-48"
          value={String(months)}
          onChange={(v) => navigate({ search: v === "3" ? { months: 3 } : v === "12" ? { months: 12 } : {}, replace: true, resetScroll: false })}
          options={STATS_PERIODS.map((m) => ({ value: String(m), label: i18n.messages.stats.periods[String(m) as "3" | "6" | "12"] }))}
        />
      </div>

      {stats.isPending ? (
        <div role="status" aria-busy="true" aria-label={t("common.loading")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-surface-container-low" />
          ))}
        </div>
      ) : stats.isError ? (
        <Card role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-sm text-on-surface-variant">
          {t("stats.loadError")}
          <Button variant="outline" size="sm" onClick={() => void stats.refetch()}>
            <RefreshCw className="size-4" aria-hidden /> {t("common.retry")}
          </Button>
        </Card>
      ) : (
        <Overview data={stats.data} />
      )}
    </div>
  );
}

function Overview({ data }: { data: StatsOverview }) {
  const i18n = useI18n();
  const { t, plural } = i18n;
  const products = (n: number) => t("stats.products", { n, unit: plural(n, ["продукт", "продукти", "продуктів"]) });
  const empty = data.months.every((m) => m.saved + m.wasted === 0);
  const c = data.current;

  if (empty) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <BarChart3 className="size-7" aria-hidden />
        </span>
        <p className="max-w-md text-sm text-on-surface-variant">{t("stats.empty")}</p>
      </Card>
    );
  }

  return (
    <>
      {/* ---------- Цього місяця ---------- */}
      <section aria-labelledby="this-month" className="flex flex-col gap-3">
        <h2 id="this-month" className="text-sm font-semibold text-on-surface-variant">
          {t("stats.thisMonth")} · {monthName(c.month, i18n.locale, "long")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<Leaf />} label={t("stats.saved")} value={String(c.saved)} hint={products(c.saved).replace(/^\d+ /, "")} swatch="bg-chart-saved" />
          <Kpi icon={<Trash2 />} label={t("stats.wasted")} value={String(c.wasted)} hint={products(c.wasted).replace(/^\d+ /, "")} swatch="bg-chart-wasted" />
          <Kpi
            icon={<Recycle />}
            label={t("stats.saveRate")}
            value={c.saveRate === null ? "—" : `${c.saveRate}%`}
            hint={c.saveRate === null ? t("stats.noRate") : t("stats.saveRateHint")}
          />
          <Kpi
            icon={<Leaf />}
            label={t("stats.co2")}
            value={`${formatNumber(c.co2SavedKg, i18n.locale)} кг`}
            hint={t("stats.co2Hint", { km: formatNumber(Math.round(c.co2SavedKg / CO2_PER_KM), i18n.locale), kg: formatNumber(c.savedKg, i18n.locale) })}
          />
        </div>
        <p className="text-2xs text-muted">{t("stats.approx")}</p>
      </section>

      {/* ---------- По місяцях ---------- */}
      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">{t("stats.byMonth")}</h2>
            <p className="text-xs text-on-surface-variant">{t("stats.byMonthText")}</p>
          </div>
          <Legend />
        </div>
        <MonthChart months={data.months} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* ---------- За категоріями ---------- */}
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-bold">{t("stats.byCategory")}</h2>
            <Legend />
          </div>
          <CategoryBars rows={data.byCategory} />
        </Card>

        <div className="flex flex-col gap-6">
          {/* ---------- Що псується ---------- */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <Trash2 className="size-4 text-on-surface-variant" aria-hidden /> {t("stats.topWasted")}
            </h2>
            {data.topWasted.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t("stats.topWastedEmpty")}</p>
            ) : (
              <>
                <ol className="flex flex-col divide-y divide-border">
                  {data.topWasted.map((w, i) => (
                    <li key={w.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-4 text-2xs text-muted">{i + 1}</span>
                        <span className="truncate font-medium">{w.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">
                        {t("stats.topWastedTimes", { n: w.times, unit: plural(w.times, ["раз", "рази", "разів"]) })}
                        {w.quantity !== null && w.unit ? ` · ${formatNumber(w.quantity, i18n.locale)} ${i18n.messages.units[w.unit]}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-2xs text-muted">{t("stats.topWastedTip")}</p>
              </>
            )}
          </Card>

          {/* ---------- Сім'я ---------- */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <Users className="size-4 text-on-surface-variant" aria-hidden /> {t("stats.family")}
            </h2>
            {data.members.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t("stats.familyEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3 text-sm">
                    <Avatar name={m.name} />
                    <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                    <span className="shrink-0 text-xs text-on-surface-variant">{products(m.saved)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Kpi({ icon, label, value, hint, swatch }: { icon: React.ReactNode; label: string; value: string; hint: string; swatch?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="flex items-center gap-2 text-xs text-on-surface-variant">
        {swatch ? <span className={cn("size-2.5 rounded-sm", swatch)} aria-hidden /> : <span className="text-primary [&>svg]:size-3.5" aria-hidden>{icon}</span>}
        {label}
      </p>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-2xs text-muted">{hint}</p>
    </Card>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <ul className="flex shrink-0 items-center gap-4 text-xs text-on-surface-variant" aria-label="Легенда">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-saved" aria-hidden /> {t("stats.saved")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-wasted" aria-hidden /> {t("stats.wasted")}
      </li>
    </ul>
  );
}

function formatNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-GB", { maximumFractionDigits: 1 }).format(n);
}

export function monthName(month: string, locale: string, style: "short" | "long") {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { month: style, ...(style === "long" ? { year: "numeric" } : {}) }).format(
    new Date(y!, m! - 1, 1),
  );
}

/** «Чисті» поділки осі з кроком 1 / 2 / 5 × 10ⁿ: від 0 до першої поділки, не меншої за максимум. */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((k) => k * pow).find((s) => s >= raw)!);
  const ticks: number[] = [];
  for (let v = 0; v < max; v += step) ticks.push(v);
  ticks.push(ticks.at(-1)! + step);
  return ticks.map((v) => Math.round(v));
}

/** Згруповані стовпці «врятовано / викинуто» по місяцях із підказкою при наведенні й таблицею для читачів екрана. */
function MonthChart({ months }: { months: StatsOverview["months"] }) {
  const i18n = useI18n();
  const { t } = i18n;
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...months.flatMap((m) => [m.saved, m.wasted])));
  const top = ticks.at(-1)!;
  const pct = (v: number) => `${(v / top) * 100}%`;

  return (
    <div>
      <div className="relative flex h-56 gap-2 pl-7" aria-hidden>
        {/* Сітка й підписи осі */}
        {ticks.map((v) => (
          <div key={v} className="pointer-events-none absolute inset-x-0 flex items-center" style={{ bottom: pct(v), transform: "translateY(50%)" }}>
            <span className="w-6 pr-1 text-right text-2xs text-muted">{v}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        ))}
        {months.map((m, i) => (
          <div
            key={m.month}
            className="relative flex flex-1 items-end justify-center gap-0.5"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            {hover === i && <div className="absolute inset-y-0 -inset-x-0.5 rounded-md bg-surface-container-low" />}
            <span className="relative w-full max-w-6 rounded-t-[4px] bg-chart-saved" style={{ height: pct(m.saved) }} />
            <span className="relative w-full max-w-6 rounded-t-[4px] bg-chart-wasted" style={{ height: pct(m.wasted) }} />
            {hover === i && (
              <div className="absolute bottom-full z-10 mb-2 w-max rounded-md border border-border bg-surface-container-lowest px-3 py-2 text-xs shadow-modal">
                <p className="mb-1 font-semibold">{monthName(m.month, i18n.locale, "long")}</p>
                <p className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-chart-saved" /> {t("stats.saved")}: <b>{m.saved}</b>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-chart-wasted" /> {t("stats.wasted")}: <b>{m.wasted}</b>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 pl-7 text-center text-2xs text-on-surface-variant" aria-hidden>
        {months.map((m) => (
          <span key={m.month} className="flex-1 truncate">
            {monthName(m.month, i18n.locale, "short")}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{t("stats.table")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("stats.month")}</th>
            <th scope="col">{t("stats.saved")}</th>
            <th scope="col">{t("stats.wasted")}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthName(m.month, i18n.locale, "long")}</th>
              <td>{m.saved}</td>
              <td>{m.wasted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Горизонтальні стовпці на категорію: дві смуги з підписами значень на кінцях. */
function CategoryBars({ rows }: { rows: StatsOverview["byCategory"] }) {
  const { t, messages } = useI18n();
  const max = Math.max(1, ...rows.flatMap((r) => [r.saved, r.wasted]));
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.category} aria-label={`${messages.categories[r.category]}: ${t("stats.saved")} ${r.saved}, ${t("stats.wasted")} ${r.wasted}`}>
          <p className="mb-1.5 text-sm font-medium">{messages.categories[r.category]}</p>
          {(
            [
              [r.saved, "bg-chart-saved"],
              [r.wasted, "bg-chart-wasted"],
            ] as const
          ).map(([value, color], i) => (
            <div key={i} className="flex items-center gap-2" aria-hidden>
              <span className={cn("h-3 rounded-r-[4px]", color, value === 0 && "w-0.5 opacity-40")} style={value ? { width: `calc(${(value / max) * 100}% - 2rem)` } : undefined} />
              <span className="text-2xs text-on-surface-variant tabular-nums">{value}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
