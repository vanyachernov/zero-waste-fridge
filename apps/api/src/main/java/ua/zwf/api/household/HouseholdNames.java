package ua.zwf.api.household;

/** Назва домогосподарства за замовчуванням (її можна змінити на екрані «Моя сім'я»). */
public final class HouseholdNames {

	static final String FALLBACK = "Мій холодильник";

	private HouseholdNames() {
	}

	/** «Олена Кравченко» → «Сім'я Кравченко»; одне слово чи порожньо → «Мій холодильник». */
	public static String forOwner(String ownerName) {
		if (ownerName == null) {
			return FALLBACK;
		}
		String[] parts = ownerName.trim().split("\\s+");
		return parts.length >= 2 ? "Сім'я " + parts[parts.length - 1] : FALLBACK;
	}

}
