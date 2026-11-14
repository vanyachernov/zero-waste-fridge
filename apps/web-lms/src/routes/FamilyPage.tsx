import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, isApiError, queryKeys, type ActivityEntry, type HouseholdPermission, type HouseholdRole, type Invite, type Member } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Avatar, Badge, Button, Card, Field, Input, Menu, Modal, Select, cn, useToast } from "@zwf/ui";
import { Check, Copy, Crown, LogOut, Mail, Minus, Pencil, RefreshCw, Send, ShieldCheck, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { FormAlert } from "../auth/FormAlert";
import { errorMessage, fieldMessage } from "../lib/errors";
import { can, householdQuery, invitesQuery, membersQuery } from "../lib/household";
import { meQuery } from "../lib/queries";
import { relativeTime } from "../lib/time";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const MATRIX: HouseholdPermission[] = [
  "VIEW_FRIDGE",
  "EDIT_PRODUCTS",
  "GENERATE_RECIPES",
  "SHOPPING_LIST",
  "RECEIVE_REMINDERS",
  "MANAGE_MEMBERS",
  "CHANGE_ROLES",
  "DELETE_HOUSEHOLD",
];
const MEMBER_CAN: HouseholdPermission[] = ["VIEW_FRIDGE", "EDIT_PRODUCTS", "GENERATE_RECIPES", "SHOPPING_LIST", "RECEIVE_REMINDERS"];
const TONES = ["primary", "warning", "neutral"] as const;

/** F-60…F-62 + I-50: «Моя сім'я» за макетом. */
export function FamilyPage() {
  const i18n = useI18n();
  const { t, plural } = i18n;
  useDocumentTitle(t("family.title"));
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const household = useQuery(householdQuery);
  const members = useQuery(membersQuery);
  const invites = useQuery(invitesQuery);
  const inviteEmailRef = useRef<HTMLInputElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const permissions = household.data?.permissions;
  const manage = can(permissions, "MANAGE_MEMBERS");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.household });
    void qc.invalidateQueries({ queryKey: queryKeys.me });
  };
  const fail = (error: unknown) => toast.show({ message: errorMessage(error, i18n), tone: "error" });

  const changeRole = useMutation({
    mutationFn: ({ member, role }: { member: Member; role: HouseholdRole }) => api.household.changeRole(member.id, role),
    onSuccess: () => {
      toast.show({ message: t("family.roleChanged"), tone: "success" });
      refresh();
    },
    onError: fail,
  });

  const removeMember = useMutation({
    mutationFn: (member: Member) => api.household.removeMember(member.id),
    onSuccess: (_, member) => {
      if (member.me) {
        toast.show({ message: t("family.left"), tone: "success" });
        qc.clear();
        void navigate({ to: "/" });
        return;
      }
      toast.show({ message: t("family.removed", { name: member.name }), tone: "success" });
      refresh();
    },
    onError: fail,
  });

  const cancelInvite = useMutation({
    mutationFn: (invite: Invite) => api.household.cancelInvite(invite.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.invites }),
    onError: fail,
  });

  const memberCount = members.data?.length ?? household.data?.memberCount ?? 0;
  const inviteCount = invites.data?.length ?? 0;
  const name = household.data?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-2xs text-on-surface-variant">
            <span className="font-bold">{t("family.breadcrumbRoot")}</span> › <span className="text-primary">{t("family.breadcrumb")}</span>
          </nav>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-display">{t("family.title")}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t("family.subtitle")}</p>
        </div>
        {manage && (
          <Button onClick={() => inviteEmailRef.current?.focus()}>
            <UserPlus className="size-4" /> {t("family.invite")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* ---------- Учасники ---------- */}
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-5">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                {t("family.members")}
                {can(permissions, "RENAME_HOUSEHOLD") && (
                  <Button variant="ghost" size="icon" className="size-7" aria-label={t("family.rename")} title={t("family.rename")} onClick={() => setRenameOpen(true)}>
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {inviteCount
                  ? t("family.membersSummary", {
                      name: `«${name}»`,
                      n: memberCount,
                      unit: plural(memberCount, ["учасник", "учасники", "учасників"]),
                      invites: inviteCount,
                      invitesUnit: plural(inviteCount, ["запрошення", "запрошення", "запрошень"]),
                    })
                  : t("family.membersSummaryNoInvites", { name: `«${name}»`, n: memberCount, unit: plural(memberCount, ["учасник", "учасники", "учасників"]) })}
              </p>
            </div>
            <Badge tone="primary">{t("family.synced")}</Badge>
          </div>
          {/* table-fixed: довгий email обрізається «…», а не розпирає сторінку на телефоні */}
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-surface-container-low text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
              <tr>
                <th className="py-2 pr-4 pl-5">{t("family.colMember")}</th>
                <th className="w-28 py-2 pr-4 sm:w-36">{t("family.colRole")}</th>
                <th className="hidden py-2 pr-4 sm:table-cell sm:w-[30%]">{t("family.colActivity")}</th>
                <th className="w-16 py-2 pr-5">
                  <span className="sr-only">{t("fridge.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.data?.map((member, index) => (
                <tr key={member.id}>
                  <td className="py-3.5 pr-4 pl-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={member.name} src={member.avatarUrl} tone={TONES[index % TONES.length]} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold">{member.name}</p>
                        <p className="truncate text-xs text-on-surface-variant">
                          {member.email}
                          {member.me && ` · ${t("family.you")}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={member.role === "OWNER" ? "primary" : "neutral"}>{i18n.messages.family.roles[member.role]}</Badge>
                  </td>
                  <td className="hidden py-3.5 pr-4 text-xs text-on-surface-variant sm:table-cell">
                    <ActivityText entry={member.lastActivity} />
                  </td>
                  <td className="py-3.5 pr-5">
                    <MemberMenu
                      member={member}
                      permissions={permissions}
                      onRole={(role) => changeRole.mutate({ member, role })}
                      onRemove={() => removeMember.mutate(member)}
                    />
                  </td>
                </tr>
              ))}
              {invites.data?.map((invite) => (
                <tr key={invite.id}>
                  <td className="py-3.5 pr-4 pl-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={invite.email} tone="muted" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-on-surface-variant">{invite.email}</p>
                        <p className="truncate text-xs text-on-surface-variant">{t("family.invitedOn", { date: i18n.formatDate(invite.createdAt) })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone="warning">{t("family.pending")}</Badge>
                  </td>
                  <td className="hidden py-3.5 pr-4 text-xs text-on-surface-variant sm:table-cell">—</td>
                  <td className="py-3.5 pr-5">
                    {manage && (
                      <Menu
                        label={t("family.inviteActions", { email: invite.email })}
                        items={[{ label: t("family.cancelInvite"), icon: <X />, tone: "danger", onSelect: () => cancelInvite.mutate(invite) }]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.isError && <p className="p-5 text-sm text-error">{errorMessage(members.error, i18n)}</p>}
        </Card>

        {manage && <InviteCard emailRef={inviteEmailRef} />}
      </div>

      {/* ---------- Ролі та права ---------- */}
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-container text-primary">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold">{t("family.rolesTitle")}</h2>
            <p className="text-xs text-on-surface-variant">{t("family.rolesSubtitle")}</p>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
            <tr>
              <th className="py-2.5 pr-4 pl-5">{t("family.colAction")}</th>
              <th className="w-28 py-2.5 pr-4 sm:w-52">{t("family.colOwner")}</th>
              <th className="w-24 py-2.5 pr-5 sm:w-52">{t("family.colMemberRole")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MATRIX.map((permission) => (
              <tr key={permission}>
                <td className="py-3 pr-4 pl-5">{i18n.messages.family.permissions[permission as keyof typeof i18n.messages.family.permissions]}</td>
                <td className="py-3 pr-4">
                  <Mark allowed />
                </td>
                <td className="py-3 pr-5">
                  <Mark allowed={MEMBER_CAN.includes(permission)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {can(permissions, "DELETE_HOUSEHOLD") && (
        <Card className="flex flex-col gap-3 border-error/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-error">{t("family.dangerTitle")}</h2>
            <p className="max-w-2xl text-xs text-on-surface-variant">{t("family.dangerText")}</p>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> {t("family.dangerButton")}
          </Button>
        </Card>
      )}

      <RenameModal open={renameOpen} current={name} onClose={() => setRenameOpen(false)} />
      <DeleteHouseholdModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function Mark({ allowed }: { allowed: boolean }) {
  const { t } = useI18n();
  return (
    <span
      role="img"
      aria-label={t(allowed ? "family.allowed" : "family.denied")}
      className={cn("flex size-6 items-center justify-center rounded-full", allowed ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-muted")}
    >
      {allowed ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
    </span>
  );
}

/** «Додано «Молоко» · 10 хв тому» — без роду дієслова, бо стать учасника невідома. */
function ActivityText({ entry }: { entry: ActivityEntry | null }) {
  const i18n = useI18n();
  if (!entry) return <span className="text-muted">{i18n.t("family.noActivity")}</span>;
  return (
    <>
      {i18n.t(`family.activity.${entry.type}`, { name: entry.subject.name })} · {relativeTime(entry.at, i18n)}
    </>
  );
}

function MemberMenu({
  member,
  permissions,
  onRole,
  onRemove,
}: {
  member: Member;
  permissions: readonly HouseholdPermission[] | undefined;
  onRole: (role: HouseholdRole) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const items = [
    ...(can(permissions, "CHANGE_ROLES")
      ? [
          member.role === "OWNER"
            ? { label: t("family.makeMember"), icon: <Users />, onSelect: () => onRole("MEMBER") }
            : { label: t("family.makeOwner"), icon: <Crown />, onSelect: () => onRole("OWNER") },
        ]
      : []),
    ...(member.me
      ? [{ label: t("family.leave"), icon: <LogOut />, tone: "danger" as const, onSelect: onRemove }]
      : can(permissions, "MANAGE_MEMBERS")
        ? [{ label: t("family.removeMember"), icon: <UserMinus />, tone: "danger" as const, onSelect: onRemove }]
        : []),
  ];
  if (!items.length) return null;
  return <Menu label={t("family.memberActions", { name: member.name })} items={items} />;
}

/** F-60: «Запросити до сім'ї» — лист і код сім'ї. */
function InviteCard({ emailRef }: { emailRef: React.RefObject<HTMLInputElement | null> }) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<HouseholdRole>("MEMBER");
  const code = useQuery({ queryKey: queryKeys.familyCode, queryFn: () => api.household.code() });

  const invite = useMutation({
    mutationFn: () => api.household.invite(email, role),
    onSuccess: (created) => {
      setEmail("");
      toast.show({ message: created.emailSent ? t("family.sent", { email: created.email }) : t("family.sentNoMail"), tone: created.emailSent ? "success" : "info" });
      void qc.invalidateQueries({ queryKey: queryKeys.invites });
    },
  });

  const regenerate = useMutation({
    mutationFn: () => api.household.regenerateCode(),
    onSuccess: (next) => qc.setQueryData(queryKeys.familyCode, next),
    onError: (error) => toast.show({ message: errorMessage(error, i18n), tone: "error" }),
  });

  const copy = async () => {
    if (!code.data?.code) return;
    try {
      await navigator.clipboard.writeText(code.data.code);
      toast.show({ message: t("family.codeCopied"), tone: "success" });
    } catch (error) {
      toast.show({ message: errorMessage(error, i18n), tone: "error" });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };

  const emailError = isApiError(invite.error) ? invite.error.fieldErrors.email : undefined;
  const general = invite.isError && !emailError ? errorMessage(invite.error, i18n) : null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-container text-on-primary-container">
          <UserPlus className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold">{t("family.inviteTitle")}</h2>
          <p className="text-xs text-on-surface-variant">{t("family.inviteSubtitle")}</p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormAlert message={general} />
        <Field label={t("family.email")} error={fieldMessage(emailError, i18n)} htmlFor="invite-email">
          <Input
            ref={emailRef}
            id="invite-email"
            type="email"
            autoComplete="email"
            leading={<Mail className="size-4" />}
            placeholder={t("family.emailPlaceholder")}
            value={email}
            invalid={Boolean(emailError)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t("family.role")} htmlFor="invite-role">
          <Select
            id="invite-role"
            value={role}
            onChange={setRole}
            options={(["MEMBER", "OWNER"] as const).map((r) => ({ value: r, label: messages.family.roleOptions[r] }))}
          />
        </Field>
        <Button type="submit" disabled={invite.isPending || !email.trim()}>
          <Send className="size-4" /> {t("family.send")}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> {t("family.orCode")} <span className="h-px flex-1 bg-border" />
      </div>
      {code.data?.code ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-border bg-surface-container-low px-4 py-2.5">
          <span className="flex-1 text-xl font-bold tracking-wide text-primary" data-testid="family-code">
            {code.data.code}
          </span>
          <Button variant="ghost" size="icon" aria-label={t("family.copyCode")} title={t("family.copyCode")} onClick={() => void copy()}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("family.newCode")} title={t("family.newCode")} onClick={() => regenerate.mutate()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => regenerate.mutate()} disabled={code.isPending || regenerate.isPending}>
          <RefreshCw className="size-4" /> {t("family.generateCode")}
        </Button>
      )}
      <p className="text-xs text-on-surface-variant">
        {code.data?.expiresAt ? t("family.codeHintUntil", { date: i18n.formatDate(code.data.expiresAt) }) : t("family.codeHint")}
      </p>
    </Card>
  );
}

function RenameModal({ open, current, onClose }: { open: boolean; current: string; onClose: () => void }) {
  const i18n = useI18n();
  const { t } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(current);
  const rename = useMutation({
    mutationFn: () => api.household.rename(name),
    onSuccess: (household) => {
      qc.setQueryData(queryKeys.household, household);
      void qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.show({ message: t("family.renamed"), tone: "success" });
      onClose();
    },
  });
  const error = isApiError(rename.error) ? rename.error.fieldErrors.name : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Pencil />}
      title={t("family.rename")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button type="submit" form="rename-household" disabled={rename.isPending}>
            {t("shopping.settingsSave")}
          </Button>
        </>
      }
    >
      <form
        id="rename-household"
        onSubmit={(e) => {
          e.preventDefault();
          rename.mutate();
        }}
      >
        <Field label={t("family.renameLabel")} error={fieldMessage(error, i18n)} htmlFor="household-name">
          <Input id="household-name" autoFocus defaultValue={current} invalid={Boolean(error)} onChange={(e) => setName(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

/** B-55: лише власник, з паролем. */
function DeleteHouseholdModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const i18n = useI18n();
  const { t } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const remove = useMutation({
    mutationFn: () => api.household.remove(password),
    onSuccess: (me) => {
      qc.clear();
      qc.setQueryData(meQuery.queryKey, me);
      toast.show({ message: t("family.deleted"), tone: "success" });
      onClose();
      void navigate({ to: "/" });
    },
  });
  const error = isApiError(remove.error) ? remove.error.fieldErrors.password : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Trash2 />}
      iconTone="error"
      title={t("family.deleteTitle")}
      description={t("family.deleteDescription")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button variant="danger" type="submit" form="delete-household" disabled={remove.isPending || !password}>
            <Trash2 className="size-4" /> {t("family.deleteConfirm")}
          </Button>
        </>
      }
    >
      <form
        id="delete-household"
        onSubmit={(e) => {
          e.preventDefault();
          remove.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-sm text-on-surface-variant">{t("family.dangerText")}</p>
        <Field label={t("family.password")} error={fieldMessage(error, i18n)} htmlFor="delete-password">
          <Input id="delete-password" type="password" autoComplete="current-password" value={password} invalid={Boolean(error)} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
