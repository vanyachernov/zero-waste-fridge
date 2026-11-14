import type { Translator } from "@zwf/i18n";

/** «щойно», «15 хв тому», «2 год тому», «вчора», «3 дні тому», далі — дата. */
export function relativeTime(iso: string, { t, plural, formatDate }: Pick<Translator, "t" | "plural" | "formatDate">, now = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t("time.minutesAgo", { n: minutes });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (then.getTime() >= startOfToday) return t("time.hoursAgo", { n: Math.floor(minutes / 60) });
  const days = Math.ceil((startOfToday - then.getTime()) / 86_400_000);
  if (days === 1) return t("time.yesterday");
  if (days < 7) return t("time.daysAgo", { n: days, unit: plural(days, ["день", "дні", "днів"]) });
  return formatDate(then);
}
