package ua.zwf.api.product;

/**
 * Тіло {@code POST /api/products/{id}/write-off}.
 *
 * @param quantity {@code "all"} (або відсутнє) — усе; число — частково, в одиницях продукту
 * @param addToShoppingList «Додати … до списку покупок» (B-40): {@code true} — позиція {@code WRITE_OFF}, якщо
 *     такої назви ще немає серед некуплених; {@code false} — користувач зняв галочку, нічого не додаємо (і Smart
 *     Sync теж); відсутнє — вирішує Smart Sync (B-43)
 */
public record WriteOffRequest(WriteOffOutcome outcome, Object quantity, Boolean addToShoppingList) {

	public static final String ALL = "all";

}
