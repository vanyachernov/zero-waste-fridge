package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.auth.AppUserPrincipal;

/** B-50: матриця «Ролі та права доступу» з макета. */
class HouseholdRoleTest {

	@Test
	void ownerCanEverything() {
		for (HouseholdPermission permission : HouseholdPermission.values()) {
			assertThat(HouseholdRole.OWNER.can(permission)).as(permission.name()).isTrue();
		}
	}

	@Test
	void memberWorksWithFridgeButDoesNotManageTheFamily() {
		assertThat(HouseholdRole.MEMBER.permissions()).containsExactlyInAnyOrder(HouseholdPermission.VIEW_FRIDGE,
				HouseholdPermission.EDIT_PRODUCTS, HouseholdPermission.GENERATE_RECIPES,
				HouseholdPermission.SHOPPING_LIST, HouseholdPermission.RECEIVE_REMINDERS);
		assertThat(HouseholdRole.MEMBER.can(HouseholdPermission.MANAGE_MEMBERS)).isFalse();
		assertThat(HouseholdRole.MEMBER.can(HouseholdPermission.CHANGE_ROLES)).isFalse();
		assertThat(HouseholdRole.MEMBER.can(HouseholdPermission.DELETE_HOUSEHOLD)).isFalse();
	}

	@Test
	void permissionsCopyCannotChangeTheMatrix() {
		HouseholdRole.MEMBER.permissions().add(HouseholdPermission.DELETE_HOUSEHOLD);

		assertThat(HouseholdRole.MEMBER.can(HouseholdPermission.DELETE_HOUSEHOLD)).isFalse();
	}

	@Test
	void accessChecksRoleFromDatabase() {
		var memberships = mock(MembershipRepository.class);
		var access = new HouseholdAccess(memberships);
		var owner = new AppUserPrincipal(UUID.randomUUID(), "o@x.y", "O", null);
		var member = new AppUserPrincipal(UUID.randomUUID(), "m@x.y", "M", null);
		var gone = new AppUserPrincipal(UUID.randomUUID(), "g@x.y", "G", null);
		when(memberships.findRoleByUserId(owner.id())).thenReturn(Optional.of(HouseholdRole.OWNER));
		when(memberships.findRoleByUserId(member.id())).thenReturn(Optional.of(HouseholdRole.MEMBER));
		when(memberships.findRoleByUserId(gone.id())).thenReturn(Optional.empty());

		assertThat(access.can(owner, "MANAGE_MEMBERS")).isTrue();
		assertThat(access.can(member, "MANAGE_MEMBERS")).isFalse();
		assertThat(access.can(member, "SHOPPING_LIST")).isTrue();
		assertThat(access.can(gone, "VIEW_FRIDGE")).isFalse();
		assertThat(access.can("anonymousUser", "VIEW_FRIDGE")).isFalse();
	}

}
