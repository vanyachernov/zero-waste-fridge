package ua.zwf.api.product;

/**
 * Тіло {@code POST /api/products/{id}/write-off}.
 *
 * @param quantity {@code "all"} (або відсутнє) — усе; число — частково, в одиницях продукту
 * @param addToShoppingList «Додати … до списку покупок» (B-40): позиція {@code WRITE_OFF}, якщо такої
 *     назви ще немає серед некуплених
 */
public record WriteOffRequest(WriteOffOutcome outcome, Object quantity, Boolean addToShoppingList) {

	/** Поле необов'язкове: відсутнє = {@code false}. */
	public WriteOffRequest {
		addToShoppingList = Boolean.TRUE.equals(addToShoppingList);
	}

	public static final String ALL = "all";

}
