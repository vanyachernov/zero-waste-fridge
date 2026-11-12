import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { api } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Card, Field, Input, useToast } from "@zwf/ui";
import { Info, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormAlert } from "../auth/FormAlert";
import { errorMessage } from "../lib/errors";
import { meQuery } from "../lib/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const route = getRouteApi("/_authenticated/join");

/** F-61: вступ до сім'ї — за кодом або за посиланням із листа (`/lms/join?invite=…`). */
export function JoinPage() {
  const i18n = useI18n();
  const { t } = i18n;
  useDocumentTitle(t("join.title"));
  const { invite, code: initialCode } = route.useSearch();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode ?? "");

  const join = useMutation({
    mutationFn: () => api.household.join(invite ? { invite } : { code }),
    onSuccess: (me) => {
      qc.clear();
      qc.setQueryData(meQuery.queryKey, me);
      toast.show({ message: t("join.joined", { name: me.householdName }), tone: "success" });
      void navigate({ to: "/family" });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    join.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-container text-on-primary-container">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t("join.title")}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{invite ? t("join.inviteSubtitle") : t("join.subtitle")}</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormAlert message={join.isError ? errorMessage(join.error, i18n) : null} />
          {!invite && (
            <Field label={t("join.code")} htmlFor="join-code">
              <Input
                id="join-code"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                className="font-bold tracking-wide"
                placeholder={t("join.codePlaceholder")}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
          )}
          <p className="flex gap-2 rounded-lg bg-secondary-container p-3 text-2xs text-on-secondary-container">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden /> {t("join.note")}
          </p>
          <Button type="submit" disabled={join.isPending || (!invite && !code.trim())}>
            <Users className="size-4" /> {invite ? t("join.acceptInvite") : t("join.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
