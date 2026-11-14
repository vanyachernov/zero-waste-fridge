package ua.zwf.api.recipe;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.Unit;

/** Продукт холодильника в тому вигляді, який потрібен підбору рецептів. */
public record FridgeItem(UUID id, String name, BigDecimal quantity, Unit unit, long daysLeft) {

	/** «Потребує уваги»: сьогодні, завтра, післязавтра (≤ 48 год, як картка «Скоро зіпсуються»). */
	public static final int CRITICAL_DAYS = 2;

	public static FridgeItem of(Product product, long daysLeft) {
		return new FridgeItem(product.getId(), product.getName(), product.getQuantity(), product.getUnit(), daysLeft);
	}

	public boolean critical() {
		return daysLeft <= CRITICAL_DAYS;
	}

	boolean matches(RecipeIngredient ingredient) {
		if (id.equals(ingredient.getProductId())) {
			return true;
		}
		String lower = name.toLowerCase(Locale.ROOT);
		return ingredient.getKeywords().stream().anyMatch(lower::contains);
	}

}
