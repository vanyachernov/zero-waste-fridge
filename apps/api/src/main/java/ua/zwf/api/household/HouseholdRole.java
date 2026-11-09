package ua.zwf.api.household;

import java.util.EnumSet;
import java.util.Set;

/** Ролі з макета «Моя сім'я» → «Ролі та права доступу». */
public enum HouseholdRole {

	/** Користувач (Власник): усі права, включно з учасниками, ролями й видаленням даних. */
	OWNER(EnumSet.allOf(HouseholdPermission.class)),

	/** Член сім'ї: холодильник, рецепти, список покупок, нагадування. */
	MEMBER(EnumSet.of(HouseholdPermission.VIEW_FRIDGE, HouseholdPermission.EDIT_PRODUCTS,
			HouseholdPermission.GENERATE_RECIPES, HouseholdPermission.SHOPPING_LIST,
			HouseholdPermission.RECEIVE_REMINDERS));

	private final Set<HouseholdPermission> permissions;

	HouseholdRole(Set<HouseholdPermission> permissions) {
		this.permissions = permissions;
	}

	public boolean can(HouseholdPermission permission) {
		return permissions.contains(permission);
	}

	/** Копія — щоб ніхто не змінив матрицю ззовні. */
	public Set<HouseholdPermission> permissions() {
		return EnumSet.copyOf(permissions);
	}

}
