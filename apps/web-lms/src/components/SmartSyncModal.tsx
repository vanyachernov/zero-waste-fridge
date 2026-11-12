import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type Category } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Chip, Modal, Switch, useToast } from "@zwf/ui";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "../lib/errors";
import { CATEGORY_EMOJI, CATEGORY_ORDER } from "./categoryEmoji";

/** F-51: налаштування автопоповнення (B-43). */
export function SmartSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: queryKeys.shoppingSettings, queryFn: () => api.shoppingList.settings(), enabled: open });
  const [autoRefill, setAutoRefill] = useState(true);
  const [excluded, setExcluded] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Значення з сервера підставляємо один раз за відкриття: фоновий refetch не має скидати те, що вже змінили
  useEffect(() => {
    if (!open) return setLoaded(false);
    if (loaded || !settings.data) return;
    setAutoRefill(settings.data.autoRefill);
    setExcluded(settings.data.excludedCategories);
    setLoaded(true);
  }, [open, settings.data, loaded]);

  const save = useMutation({
    mutationFn: () => api.shoppingList.saveSettings({ autoRefill, excludedCategories: excluded }),
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.shoppingSettings, saved);
      toast.show({ message: t("shopping.settingsSaved"), tone: "success" });
      onClose();
    },
    onError: (error) => toast.show({ message: errorMessage(error, i18n), tone: "error" }),
  });

  const toggle = (c: Category) => setExcluded((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<RefreshCcw />}
      title={t("shopping.settingsTitle")}
      description={t("shopping.settingsDescription")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !loaded}>
            {t("shopping.settingsSave")}
          </Button>
        </>
      }
    >
      <Switch checked={autoRefill} onChange={setAutoRefill} disabled={!loaded} label={t("shopping.settingsEnabled")} description={t("shopping.settingsEnabledHint")} />
      <fieldset disabled={!autoRefill || !loaded} className="flex flex-col gap-2 disabled:opacity-50">
        <legend className="mb-2 text-xs font-semibold text-on-surface-variant">{t("shopping.settingsExcluded")}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} active={excluded.includes(c)} onClick={() => toggle(c)}>
              {CATEGORY_EMOJI[c]} {messages.categories[c]}
            </Chip>
          ))}
        </div>
      </fieldset>
    </Modal>
  );
}
