package ua.zwf.api.shopping;

import java.math.BigDecimal;
import java.util.Objects;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;

/** Редаговані поля позиції; перевірки полів із кодами помилок робить {@link ShoppingListService}. */
public record ShoppingItemDetails(String name, BigDecimal quantity, Unit unit, ProductCategory category,
		ShoppingPriority priority, BigDecimal priceEstimate) {

	public ShoppingItemDetails {
		name = Objects.requireNonNull(name, "name").strip().replaceAll("\\s+", " ");
		if (name.isEmpty() || name.length() > ShoppingItem.NAME_MAX) {
			throw new IllegalArgumentException("name must be 1.." + ShoppingItem.NAME_MAX + " characters");
		}
		if ((quantity == null) != (unit == null)) {
			throw new IllegalArgumentException("quantity and unit go together");
		}
		if (quantity != null && quantity.signum() <= 0) {
			throw new IllegalArgumentException("quantity must be positive");
		}
		if (priceEstimate != null && priceEstimate.signum() < 0) {
			throw new IllegalArgumentException("priceEstimate must not be negative");
		}
		priority = priority == null ? ShoppingPriority.NORMAL : priority;
	}

}
