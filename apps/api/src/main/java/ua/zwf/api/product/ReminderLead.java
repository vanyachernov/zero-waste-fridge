package ua.zwf.api.product;

import java.util.List;

/** «Нагадати до кінця терміну за»: 1 день / 2 дні / 3 дні / тиждень (модалка «Додати продукт»). */
public final class ReminderLead {

	public static final List<Integer> ALLOWED_DAYS = List.of(1, 2, 3, 7);

	public static final int DEFAULT_DAYS = 2;

	private ReminderLead() {
	}

	public static boolean isAllowed(int days) {
		return ALLOWED_DAYS.contains(days);
	}

}
