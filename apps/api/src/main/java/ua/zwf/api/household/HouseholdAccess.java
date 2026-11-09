package ua.zwf.api.household;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.AppUserPrincipal;

/** Перевірка прав для {@link RequiresPermission}: роль береться з БД, а не із сесії (її могли щойно змінити). */
@Component("householdAccess")
public class HouseholdAccess {

	private final MembershipRepository memberships;

	public HouseholdAccess(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	@Transactional(readOnly = true)
	public boolean can(Object principal, String permission) {
		if (!(principal instanceof AppUserPrincipal user)) {
			return false;
		}
		var required = HouseholdPermission.valueOf(permission);
		return memberships.findRoleByUserId(user.id()).map(role -> role.can(required)).orElse(false);
	}

}
