import { ApiError } from "./http";
import { mockAccounts, mockSessionUser, requireMockSession, type MockAccount } from "./mock-auth";
import { mockFridgeControl } from "./mock-fridge";
import { mockShoppingControl } from "./mock-shopping";
import type {
  ActivityEntry,
  ActivityPage,
  CurrentUser,
  FamilyCode,
  Household,
  HouseholdPermission,
  HouseholdRole,
  Invite,
  JoinRequest,
  Member,
} from "./types";

/**
 * In-memory сім'я, що поводиться як бекенд B-50…B-55: права за роллю (403 `FORBIDDEN`), учасники,
 * останній власник (409 `LAST_OWNER`), запрошення листом і кодом, вступ із переносом даних, видалення.
 * Паритет перевіряє `tests/web-lms/unit/api-client/mock-household.test.ts`.
 */

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;
const TTL = 7 * DAY;

const OWNER: HouseholdPermission[] = [
  "VIEW_FRIDGE", "EDIT_PRODUCTS", "GENERATE_RECIPES", "SHOPPING_LIST", "RECEIVE_REMINDERS",
  "MANAGE_MEMBERS", "CHANGE_ROLES", "DELETE_HOUSEHOLD", "RENAME_HOUSEHOLD",
];
const MEMBER: HouseholdPermission[] = ["VIEW_FRIDGE", "EDIT_PRODUCTS", "GENERATE_RECIPES", "SHOPPING_LIST", "RECEIVE_REMINDERS"];
export const PERMISSIONS: Record<HouseholdRole, HouseholdPermission[]> = { OWNER, MEMBER };

interface StoredInvite extends Invite {
  householdId: string;
  token: string;
  acceptedAt: string | null;
}

let invites: StoredInvite[] = [];
let codes = new Map<string, { code: string; expiresAt: string }>();
let seq = 900;
/** Посилання з останнього «листа» — для демо-режиму і тестів. */
let lastInviteLink: string | null = null;

function seed() {
  const sent = new Date(Date.now() - 3 * DAY).toISOString();
  invites = [
    {
      id: "inv1", householdId: "h1", email: "andriy.k@gmail.com", role: "MEMBER", invitedBy: "Олена Кравченко",
      createdAt: sent, expiresAt: new Date(Date.parse(sent) + TTL).toISOString(), emailSent: true, token: "mock-invite-andriy", acceptedAt: null,
    },
  ];
  codes = new Map([["h1", { code: "ZWF-4821-KR", expiresAt: new Date(Date.now() + 5 * DAY).toISOString() }]]);
  lastInviteLink = null;
  seq = 900;
}
seed();

function current(): MockAccount {
  const user = mockSessionUser();
  const account = user ? mockAccounts.byId(user.id) : undefined;
  if (!account) throw new ApiError(401, "Session is no longer valid", { code: "SESSION_EXPIRED" });
  return account;
}

function require(permission: HouseholdPermission) {
  const account = current();
  if (!PERMISSIONS[account.user.role].includes(permission)) {
    throw new ApiError(403, "Not allowed for your household role", { code: "FORBIDDEN" });
  }
  return account;
}

const membersOf = (household: string) => mockAccounts.all().filter((a) => a.user.householdId === household);
const validation = (errors: Record<string, string>) => new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });
const lastOwner = () => new ApiError(409, "The household must keep at least one owner", { code: "LAST_OWNER" });

function moveTo(account: MockAccount, household: string, name: string, role: HouseholdRole) {
  Object.assign(account.user, { householdId: household, householdName: name, role });
  account.joinedAt = new Date().toISOString();
}

function ownHousehold(account: MockAccount) {
  const parts = account.user.name.trim().split(/\s+/);
  moveTo(account, mockAccounts.nextHouseholdId(), parts.length >= 2 ? `Сім'я ${parts.at(-1)}` : "Мій холодильник", "OWNER");
}

/** Стрічка з подій продуктів і позицій списку — як ActivityService. */
function activity(household: string, actorId?: string): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  for (const e of mockFridgeControl.events(household)) {
    entries.push({
      type: `PRODUCT_${e.type}` as ActivityEntry["type"], at: e.at, actor: e.actor,
      subject: { kind: "PRODUCT", id: e.productId, name: e.productName }, outcome: e.outcome, quantity: e.quantity, unit: e.unit,
    });
  }
  for (const i of mockShoppingControl.items(household)) {
    if (i.source !== "AUTO") {
      entries.push({ type: "SHOPPING_ADDED", at: i.createdAt, actor: i.addedBy, subject: { kind: "SHOPPING_ITEM", id: i.id, name: i.name }, outcome: null, quantity: null, unit: null });
    }
    if (i.boughtAt) {
      entries.push({ type: "SHOPPING_BOUGHT", at: i.boughtAt, actor: i.boughtBy, subject: { kind: "SHOPPING_ITEM", id: i.id, name: i.name }, outcome: null, quantity: null, unit: null });
    }
  }
  return entries.filter((e) => !actorId || e.actor?.id === actorId).sort((a, b) => b.at.localeCompare(a.at));
}

function member(a: MockAccount, me: string): Member {
  const { id, name, email, avatarUrl, role, householdId } = a.user;
  return { id, name, email, avatarUrl, role, joinedAt: a.joinedAt, me: id === me, lastActivity: activity(householdId, id)[0] ?? null };
}

function generateCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ZWF-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}`;
}

export function normalizeJoinCode(input: string): string | null {
  let compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("ZWF") && compact.length === 9) compact = compact.slice(3);
  return compact.length === 6 ? `ZWF-${compact.slice(0, 4)}-${compact.slice(4)}` : null;
}

export const mockHousehold = {
  async get(): Promise<Household> {
    requireMockSession();
    await delay(60);
    const { user } = current();
    return {
      id: user.householdId, name: user.householdName, createdAt: "2026-01-10T09:00:00Z", memberCount: membersOf(user.householdId).length,
      role: user.role, permissions: PERMISSIONS[user.role],
    };
  },

  async rename(raw: string): Promise<Household> {
    requireMockSession();
    await delay(60);
    const { user } = require("RENAME_HOUSEHOLD");
    const name = raw?.trim().replace(/\s+/g, " ");
    if (name == null) throw validation({ name: "NotNull" });
    if (!name) throw validation({ name: "NotBlank" });
    if (name.length > 120) throw validation({ name: "Size" });
    membersOf(user.householdId).forEach((a) => (a.user.householdName = name));
    return mockHousehold.get();
  },

  async remove(password: string): Promise<CurrentUser> {
    requireMockSession();
    await delay();
    const account = require("DELETE_HOUSEHOLD");
    if (!password) throw validation({ password: "NotBlank" });
    if (password !== account.password) throw validation({ password: "INVALID_PASSWORD" });
    const doomed = account.user.householdId;
    membersOf(doomed).forEach(ownHousehold);
    mockFridgeControl.drop(doomed);
    mockShoppingControl.drop(doomed);
    invites = invites.filter((i) => i.householdId !== doomed);
    codes.delete(doomed);
    return { ...account.user };
  },

  async members(): Promise<Member[]> {
    requireMockSession();
    await delay();
    const { user } = current();
    return membersOf(user.householdId)
      .sort((a, b) => (a.user.role === b.user.role ? a.joinedAt.localeCompare(b.joinedAt) : a.user.role === "OWNER" ? -1 : 1))
      .map((a) => member(a, user.id));
  },

  async changeRole(userId: string, role: HouseholdRole): Promise<Member> {
    requireMockSession();
    await delay(60);
    const actor = require("CHANGE_ROLES");
    if (!role) throw validation({ role: "NotNull" });
    const target = membersOf(actor.user.householdId).find((a) => a.user.id === userId);
    if (!target) throw new ApiError(404, "Member not found in your household", { code: "MEMBER_NOT_FOUND" });
    const owners = membersOf(actor.user.householdId).filter((a) => a.user.role === "OWNER").length;
    if (target.user.role === "OWNER" && role !== "OWNER" && owners <= 1) throw lastOwner();
    target.user.role = role;
    return member(target, actor.user.id);
  },

  async removeMember(userId: string): Promise<void> {
    requireMockSession();
    await delay(60);
    const actor = current();
    const leaving = actor.user.id === userId;
    if (!leaving && !PERMISSIONS[actor.user.role].includes("MANAGE_MEMBERS")) throw new ApiError(403, "Not allowed for your household role", { code: "FORBIDDEN" });
    const household = actor.user.householdId;
    const target = membersOf(household).find((a) => a.user.id === userId);
    if (!target) throw new ApiError(404, "Member not found in your household", { code: "MEMBER_NOT_FOUND" });
    if (target.user.role === "OWNER" && membersOf(household).filter((a) => a.user.role === "OWNER").length <= 1) throw lastOwner();
    ownHousehold(target);
  },

  async activity(before?: string, limit = 20): Promise<ActivityPage> {
    requireMockSession();
    await delay();
    if (limit < 1 || limit > 100) throw validation({ limit: "Range" });
    const items = activity(current().user.householdId).filter((e) => !before || e.at < before).slice(0, limit);
    return { items, nextBefore: items.length === limit ? items.at(-1)!.at : null };
  },

  async invite(email: string, role: HouseholdRole = "MEMBER"): Promise<Invite> {
    requireMockSession();
    await delay();
    const actor = require("MANAGE_MEMBERS");
    const normalized = email?.trim().toLowerCase();
    if (!normalized) throw validation({ email: "NotBlank" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw validation({ email: "Email" });
    const household = actor.user.householdId;
    if (membersOf(household).some((a) => a.user.email === normalized)) {
      throw new ApiError(409, "Already a member of this household", { code: "ALREADY_MEMBER", fieldErrors: { email: "ALREADY_MEMBER" } });
    }
    const open = invites.find((i) => i.householdId === household && i.email === normalized && !i.acceptedAt);
    if (open && Date.parse(open.expiresAt) > Date.now()) {
      throw new ApiError(409, "An open invite for this email already exists", { code: "INVITE_EXISTS", fieldErrors: { email: "INVITE_EXISTS" } });
    }
    invites = invites.filter((i) => i !== open);
    const now = new Date();
    const invite: StoredInvite = {
      id: `inv${++seq}`, householdId: household, email: normalized, role, invitedBy: actor.user.name, createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL).toISOString(), emailSent: true, token: `mock-invite-${seq}`, acceptedAt: null,
    };
    invites.push(invite);
    lastInviteLink = `/lms/join?invite=${invite.token}`;
    console.info(`[mock mail] Запрошення для ${normalized}: ${lastInviteLink}`);
    const { householdId: _h, token: _t, acceptedAt: _a, ...rest } = invite;
    return rest;
  },

  async invites(): Promise<Invite[]> {
    requireMockSession();
    await delay(60);
    const household = current().user.householdId;
    return invites
      .filter((i) => i.householdId === household && !i.acceptedAt && Date.parse(i.expiresAt) > Date.now())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ householdId: _h, token: _t, acceptedAt: _a, ...rest }) => rest);
  },

  async cancelInvite(id: string): Promise<void> {
    requireMockSession();
    await delay(60);
    const actor = require("MANAGE_MEMBERS");
    const invite = invites.find((i) => i.id === id && i.householdId === actor.user.householdId);
    if (!invite) throw new ApiError(404, "Invite not found", { code: "INVITE_NOT_FOUND" });
    invites = invites.filter((i) => i !== invite);
  },

  async code(): Promise<FamilyCode> {
    requireMockSession();
    await delay(40);
    const code = codes.get(require("MANAGE_MEMBERS").user.householdId);
    return code && Date.parse(code.expiresAt) > Date.now() ? { ...code } : { code: null, expiresAt: null };
  },

  async regenerateCode(): Promise<FamilyCode> {
    requireMockSession();
    await delay(60);
    const household = require("MANAGE_MEMBERS").user.householdId;
    const next = { code: generateCode(), expiresAt: new Date(Date.now() + TTL).toISOString() };
    codes.set(household, next);
    return { ...next };
  },

  async join(request: JoinRequest): Promise<CurrentUser> {
    requireMockSession();
    await delay();
    const account = current();
    const hasCode = Boolean(request?.code?.trim());
    const hasInvite = Boolean(request?.invite?.trim());
    if (hasCode === hasInvite) throw validation(hasCode ? { invite: "EXCLUSIVE" } : { code: "NotBlank" });
    const invalid = () => new ApiError(400, "Invite or code is invalid or expired", { code: "INVALID_INVITE" });

    let target: { household: string; role: HouseholdRole; invite?: StoredInvite };
    if (hasCode) {
      const normalized = normalizeJoinCode(request.code!);
      const entry = [...codes.entries()].find(([, c]) => c.code === normalized && Date.parse(c.expiresAt) > Date.now());
      if (!entry) throw invalid();
      target = { household: entry[0], role: "MEMBER" };
    } else {
      const invite = invites.find((i) => i.token === request.invite!.trim() && !i.acceptedAt && Date.parse(i.expiresAt) > Date.now());
      if (!invite) throw invalid();
      if (invite.email !== account.user.email) throw new ApiError(403, "This invite was sent to another email", { code: "INVITE_EMAIL_MISMATCH" });
      target = { household: invite.householdId, role: invite.role, invite };
    }

    const from = account.user.householdId;
    if (from === target.household) throw new ApiError(409, "Already a member of this household", { code: "ALREADY_MEMBER" });
    const alone = membersOf(from).length === 1;
    if (!alone && account.user.role === "OWNER" && membersOf(from).filter((a) => a.user.role === "OWNER").length === 1) throw lastOwner();

    const name = membersOf(target.household)[0]?.user.householdName ?? account.user.householdName;
    moveTo(account, target.household, name, target.role);
    if (target.invite) target.invite.acceptedAt = new Date().toISOString();
    if (alone) {
      mockFridgeControl.reassign(from, target.household);
      mockShoppingControl.reassign(from, target.household);
      invites = invites.filter((i) => i.householdId !== from);
      codes.delete(from);
    }
    return { ...account.user };
  },
};

export const mockHouseholdControl = {
  reset: seed,
  lastInviteLink: () => lastInviteLink,
  /** Код сім'ї демо-домогосподарства (h1) — для тестів вступу. */
  codeOf: (household: string) => codes.get(household)?.code ?? null,
};
