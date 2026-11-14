package ua.zwf.api.recipe;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import ua.zwf.api.product.Unit;

/** Перерахунок кількостей рецепта на порції та в одиниці продукту (г ↔ кг, мл ↔ л, шт). */
final class Quantities {

	private Quantities() {
	}

	/** Кількість на {@code portions} порцій; {@code null} — без кількості («за смаком»). */
	static BigDecimal scale(BigDecimal quantity, int servings, int portions) {
		if (quantity == null) {
			return null;
		}
		return quantity.multiply(BigDecimal.valueOf(portions)).divide(BigDecimal.valueOf(servings), 3, RoundingMode.HALF_UP);
	}

	/** Перевести в одиниці продукту; порожньо, якщо одиниці несумісні (шт проти грамів). */
	static Optional<BigDecimal> convert(BigDecimal quantity, Unit from, Unit to) {
		if (quantity == null || from == null) {
			return Optional.empty();
		}
		if (from == to) {
			return Optional.of(quantity);
		}
		BigDecimal base = switch (from) {
			case KILOGRAMS, LITERS -> quantity.multiply(BigDecimal.valueOf(1000));
			default -> quantity;
		};
		boolean sameKind = kind(from) == kind(to);
		if (!sameKind) {
			return Optional.empty();
		}
		return Optional.of(switch (to) {
			case KILOGRAMS, LITERS -> base.divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
			default -> base.setScale(3, RoundingMode.HALF_UP);
		});
	}

	private static int kind(Unit unit) {
		return switch (unit) {
			case GRAMS, KILOGRAMS -> 0;
			case MILLILITERS, LITERS -> 1;
			case PIECES -> 2;
		};
	}

	/** «200.000» → 200, «0.250» → 0.25 — без хвоста нулів у JSON. */
	static BigDecimal plain(BigDecimal value) {
		if (value == null) {
			return null;
		}
		var stripped = value.stripTrailingZeros();
		return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
	}

}
