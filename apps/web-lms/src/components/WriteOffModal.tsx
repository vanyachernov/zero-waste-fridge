import type { Product, WriteOffOutcome } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Checkbox, Field, Input, Modal, RadioCard, RadioCardGroup, SegmentedControl } from "@zwf/ui";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { fieldMessage } from "../lib/errors";
import { formatQty, freshnessLabel } from "../lib/freshness";
import { ProductIcon } from "./ProductIcon";
import type { WriteOffRequest } from "@zwf/api-client";

const OUTCOMES: { value: WriteOffOutcome; tone: "primary" | "neutral" | "error" }[] = [
  { value: "EATEN", tone: "primary" },
  { value: "COOKED", tone: "neutral" },
  { value: "WASTED", tone: "error" },
];

export interface WriteOffModalProps {
  product: Product | null;
  onClose: () => void;
  /** Модалка лише збирає рішення; надсилає (з «Скасувати» на 5 с) батьківський екран. */
  onSubmit: (product: Product, request: WriteOffRequest) => void;
}

/** F-25: «Списати продукт» за макетом. */
export function WriteOffModal({ product, onClose, onSubmit }: WriteOffModalProps) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const formId = useId();
  const [outcome, setOutcome] = useState<WriteOffOutcome>("EATEN");
  const [mode, setMode] = useState<"all" | "part">("all");
  const [part, setPart] = useState("");
  const [addToList, setAddToList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setOutcome(product.daysLeft < 0 ? "WASTED" : "EATEN");
    setMode("all");
    setPart("");
    setAddToList(true);
    setError(null);
  }, [product]);

  if (!product) return <Modal open={false} onClose={onClose} title="" children={null} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let quantity: WriteOffRequest["quantity"] = "all";
    if (mode === "part") {
      const value = Number(part.replace(",", "."));
      if (!(value > 0)) return setError("Positive");
      if (value > product.quantity) return setError("EXCEEDS_REMAINING");
      quantity = value;
    }
    onSubmit(product, { outcome, quantity, addToShoppingList: addToList });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={<Trash2 />}
      iconTone="error"
      title={t("writeOff.title")}
      description={t("writeOff.description")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("writeOff.cancel")}
          </Button>
          <Button type="submit" form={formId}>
            <Trash2 className="size-4" /> {t("writeOff.submit")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex items-center gap-3 rounded-[10px] bg-surface-container-low p-3">
          <ProductIcon category={product.category} className="size-10 bg-surface-container-lowest" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{product.name}</p>
            <p className="truncate text-xs text-on-surface-variant">
              {formatQty(product, i18n)} · {messages.categories[product.category]} · {messages.zonesShort[product.zone]}
            </p>
          </div>
          <Badge tone={product.daysLeft < 0 ? "error" : product.daysLeft <= 2 ? "warning" : "primary"}>{freshnessLabel(product.daysLeft, i18n)}</Badge>
        </div>

        <RadioCardGroup label={t("writeOff.question")} value={outcome} onChange={setOutcome}>
          <p className="text-xs font-semibold text-on-surface-variant" aria-hidden>
            {t("writeOff.question")}
          </p>
          {OUTCOMES.map(({ value, tone }) => (
            <RadioCard
              key={value}
              value={value}
              title={messages.writeOff.outcomes[value].title}
              description={messages.writeOff.outcomes[value].text}
              aside={<Badge tone={tone}>{messages.writeOff.outcomes[value].badge}</Badge>}
            />
          ))}
        </RadioCardGroup>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">{t("writeOff.howMuch")}</p>
            <p className="text-xs text-on-surface-variant">{t("writeOff.howMuchHint")}</p>
          </div>
          <SegmentedControl
            label={t("writeOff.howMuch")}
            value={mode}
            onChange={(v) => {
              setMode(v);
              setError(null);
            }}
            options={[
              { value: "all", label: t("writeOff.all", { qty: formatQty(product, i18n) }) },
              { value: "part", label: t("writeOff.part") },
            ]}
            className="sm:w-60"
            stretch
          />
        </div>
        {mode === "part" && (
          <Field label={t("writeOff.partLabel", { unit: messages.units[product.unit] })} error={fieldMessage(error, i18n)} htmlFor={`${formId}-part`}>
            <Input
              id={`${formId}-part`}
              autoFocus
              inputMode="decimal"
              value={part}
              invalid={Boolean(error)}
              onChange={(e) => {
                setPart(e.target.value);
                setError(null);
              }}
              trailing={messages.units[product.unit]}
            />
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] bg-surface-container-low px-3.5 py-3 text-[13px]">
          <Checkbox checked={addToList} onChange={(e) => setAddToList(e.target.checked)} />
          <ShoppingCart className="size-4 text-primary" aria-hidden />
          {t("writeOff.addToList", { name: product.name })}
        </label>
      </form>
    </Modal>
  );
}
