import { cn } from "@zwf/ui";

export type AuthTab = "login" | "register";

export function AuthTabs({ value, onChange, labels }: { value: AuthTab; onChange: (tab: AuthTab) => void; labels: Record<AuthTab, string> }) {
  return (
    <div role="tablist" aria-label={`${labels.login} / ${labels.register}`} className="grid grid-cols-2 rounded-lg bg-surface-container p-1">
      {(["login", "register"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`auth-tab-${tab}`}
          aria-selected={value === tab}
          aria-controls={`auth-panel-${tab}`}
          onClick={() => onChange(tab)}
          className={cn(
            "h-9 cursor-pointer rounded-md text-sm transition-colors",
            value === tab ? "bg-surface-container-lowest font-semibold text-on-surface shadow-card" : "text-muted hover:text-on-surface",
          )}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}
