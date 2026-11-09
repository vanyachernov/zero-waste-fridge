import { queryOptions } from "@tanstack/react-query";
import { api, queryKeys, type HouseholdPermission } from "@zwf/api-client";

export const householdQuery = queryOptions({ queryKey: queryKeys.household, queryFn: () => api.household.get() });
export const membersQuery = queryOptions({ queryKey: queryKeys.members, queryFn: () => api.household.members() });
export const invitesQuery = queryOptions({ queryKey: queryKeys.invites, queryFn: () => api.household.invites() });

/** F-62: права з сервера; поки не завантажились — нічого керівного не показуємо. */
export function can(permissions: readonly HouseholdPermission[] | undefined, permission: HouseholdPermission): boolean {
  return Boolean(permissions?.includes(permission));
}
