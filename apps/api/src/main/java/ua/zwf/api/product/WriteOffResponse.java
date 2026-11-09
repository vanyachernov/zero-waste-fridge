package ua.zwf.api.product;

import java.math.BigDecimal;

/** Оновлений продукт і що саме списано — для toast «Списано · Скасувати» (F-30). */
public record WriteOffResponse(ProductResponse product, WrittenOff writtenOff, boolean addedToShoppingList) {

	public record WrittenOff(WriteOffOutcome outcome, BigDecimal quantity, Unit unit, boolean closed) {
	}

}
