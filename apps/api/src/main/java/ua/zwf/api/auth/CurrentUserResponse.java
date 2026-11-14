package ua.zwf.api.auth;

import java.util.UUID;
import ua.zwf.api.household.HouseholdRole;
import ua.zwf.api.household.Membership;

/** Профіль поточного користувача — відповідь реєстрації, входу та {@code GET /api/auth/me}. */
public record CurrentUserResponse(UUID id, String name, String email, String avatarUrl, UUID householdId,
		String householdName, HouseholdRole role, String theme) {

	public static CurrentUserResponse of(Membership membership) {
		var user = membership.getUser();
		var household = membership.getHousehold();
		return new CurrentUserResponse(user.getId(), user.getName(), user.getEmail(), user.getAvatarUrl(),
				household.getId(), household.getName(), membership.getRole(), user.getTheme().api());
	}

}
