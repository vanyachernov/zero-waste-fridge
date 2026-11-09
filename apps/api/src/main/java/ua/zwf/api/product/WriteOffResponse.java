package ua.zwf.api.product;

import java.math.BigDecimal;

/**
 * Оновлений продукт і що саме списано — для toast «Списано · Скасувати» (F-30).
 * {@code addedToShoppingList} — продукт тепер є в списку покупок (за запитом або через Smart Sync).
 */
public record WriteOffResponse(ProductResponse product, WrittenOff writtenOff, boolean addedToShoppingList) {

	public record WrittenOff(WriteOffOutcome outcome, BigDecimal quantity, Unit unit, boolean closed) {
	}

}
