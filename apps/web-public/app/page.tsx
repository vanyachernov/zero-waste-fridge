import { ArrowRight, BellRing, ChefHat, Leaf, ListChecks, ScanLine, Sparkles, Users } from "lucide-react";
import { getMessages } from "@zwf/i18n";
import { Badge, Card, FreshnessBadge, Logo, buttonClasses } from "@zwf/ui";
import { LMS_URL } from "@/lib/site";

const m = getMessages("uk");

const preview = [
  { name: "Фарш яловичий свіжий", meta: "М'ясо & Риба · 500 г", days: -1, label: m.freshness.expired },
  { name: "Шпинат Baby свіжий", meta: "Овочі & Зелень · 150 г", days: 0, label: m.freshness.today },
  { name: "Грецький йогурт 5%", meta: "Молочні продукти · 350 г", days: 1, label: "1 день" },
  { name: "Полуниця солодка", meta: "Фрукти & Ягоди · 300 г", days: 4, label: "Свіже (4 дні)" },
];

const features = [
  { icon: BellRing, ...m.landing.features.track },
  { icon: ChefHat, ...m.landing.features.recipes },
  { icon: ListChecks, ...m.landing.features.shopping },
  { icon: Users, ...m.landing.features.family },
];

export default function HomePage() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface-container-lowest/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-app items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" aria-label={m.brand.name}>
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-on-surface-variant md:flex">
            <a href="#features" className="hover:text-primary">
              {m.nav.features}
            </a>
            <a href="#how" className="hover:text-primary">
              {m.landing.ctaSecondary}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={LMS_URL} className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}>
              {m.nav.login}
            </a>
            <a href={LMS_URL} className={buttonClasses("primary", "sm")}>
              {m.nav.openApp}
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-primary-container/60 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-app items-center gap-12 px-4 py-14 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col items-start gap-6">
              <Badge tone="primary" className="uppercase tracking-wide">
                <Sparkles className="size-3" aria-hidden /> {m.landing.eyebrow}
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {m.landing.title}
              </h1>
              <p className="max-w-xl text-base text-on-surface-variant sm:text-lg">{m.landing.subtitle}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <a href={LMS_URL} className={buttonClasses("primary", "lg")}>
                  {m.landing.ctaPrimary} <ArrowRight className="size-4" aria-hidden />
                </a>
                <a href="#how" className={buttonClasses("outline", "lg")}>
                  {m.landing.ctaSecondary}
                </a>
              </div>
              <dl className="mt-4 grid w-full grid-cols-3 gap-4 border-t border-border pt-6">
                {[
                  ["1 240", m.landing.statSaved],
                  ["18,4", m.landing.statCo2],
                  ["12k+", m.landing.statFamilies],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="text-2xl font-extrabold text-primary sm:text-3xl">{value}</dd>
                    <dd className="mt-1 text-2xs text-on-surface-variant sm:text-xs">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Прев'ю кабінету */}
            <Card className="relative p-4 shadow-raised sm:p-6" aria-hidden>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-2xs font-semibold text-muted uppercase">{m.fridge.breadcrumb}</p>
                  <p className="text-lg font-bold">{m.fridge.title}</p>
                </div>
                <span className={buttonClasses("primary", "sm", "pointer-events-none")}>+ {m.fridge.add}</span>
              </div>
              <ul className="divide-y divide-border">
                {preview.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 py-3">
                    <span
                      className={`flex size-5 items-center justify-center rounded-sm border-2 ${i > 0 && i < 3 ? "border-primary bg-primary" : "border-outline-variant"}`}
                    >
                      {i > 0 && i < 3 && <span className="text-[10px] font-bold text-on-primary">✓</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-2xs text-muted">{p.meta}</p>
                    </div>
                    <FreshnessBadge daysLeft={p.days} label={p.label} />
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary-container px-4 py-3">
                <span className="text-xs font-medium text-on-secondary-container">{m.fridge.selected.replace("{n}", "2")}</span>
                <span className={buttonClasses("primary", "sm", "pointer-events-none")}>
                  <ChefHat className="size-4" /> {m.fridge.getRecipe}
                </span>
              </div>
            </Card>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="scroll-mt-20 bg-surface-container-lowest py-16 md:py-24">
          <div className="mx-auto max-w-app px-4 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{m.landing.featuresTitle}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <Card key={title} className="flex flex-col gap-3 p-6">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="text-sm text-on-surface-variant">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto max-w-app px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{m.landing.howTitle}</h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {m.landing.how.map((step, i) => {
                const Icon = [ScanLine, BellRing, ListChecks, ChefHat][i] ?? Leaf;
                return (
                  <li key={step} className="relative flex flex-col gap-3 rounded-xl border border-border bg-surface-container-lowest p-6">
                    <span className="text-5xl font-extrabold text-primary-container">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="size-6 text-primary" aria-hidden />
                    <p className="text-base font-bold">{step}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="px-4 pb-16 sm:px-6 md:pb-24">
          <div className="mx-auto flex max-w-app flex-col items-start gap-6 rounded-xl bg-primary px-6 py-10 text-on-primary sm:px-12 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{m.landing.ctaBlockTitle}</h2>
              <p className="mt-2 text-sm opacity-85">{m.landing.ctaBlockText}</p>
            </div>
            <a href={LMS_URL} className={buttonClasses("secondary", "lg", "bg-surface-container-lowest text-primary")}>
              {m.landing.ctaPrimary} <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface-container-lowest">
        <div className="mx-auto flex max-w-app flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="size-3.5 text-primary" aria-hidden /> {m.brand.name} © {new Date().getFullYear()}. {m.brand.tagline}
          </span>
          <a href={LMS_URL} className="font-medium text-primary hover:underline">
            {m.nav.openApp} →
          </a>
        </div>
      </footer>
    </>
  );
}
