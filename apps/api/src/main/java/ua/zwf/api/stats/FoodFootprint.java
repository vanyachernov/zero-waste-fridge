package ua.zwf.api.stats;

import java.math.BigDecimal;
import java.util.Map;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;

/**
 * B-200: орієнтовна маса й вуглецевий слід їжі. Штуки переводимо в кг за типовою вагою категорії, мілілітри — як
 * грами. Коефіцієнти CO₂e — округлені середні з досліджень життєвого циклу продуктів (Poore & Nemecek, 2018);
 * це оцінка для мотивації, а не облік.
 */
final class FoodFootprint {

	private FoodFootprint() {
	}

	/** Типова вага «1 шт», кг. */
	static final Map<ProductCategory, Double> PIECE_KG = Map.of(ProductCategory.MEAT, 0.5, ProductCategory.DAIRY, 0.4,
			ProductCategory.VEGETABLES, 0.3, ProductCategory.FRUITS, 0.2, ProductCategory.SAUCES, 0.25,
			ProductCategory.OTHER, 0.3);

	/** кг CO₂e на кг продукту. */
	static final Map<ProductCategory, Double> CO2_PER_KG = Map.of(ProductCategory.MEAT, 20.0, ProductCategory.DAIRY,
			3.0, ProductCategory.VEGETABLES, 1.5, ProductCategory.FRUITS, 1.0, ProductCategory.SAUCES, 2.0,
			ProductCategory.OTHER, 2.0);

	static double kilograms(BigDecimal quantity, Unit unit, ProductCategory category) {
		if (quantity == null || unit == null) {
			return 0;
		}
		double q = quantity.doubleValue();
		return switch (unit) {
			case GRAMS, MILLILITERS -> q / 1000;
			case KILOGRAMS, LITERS -> q;
			case PIECES -> q * PIECE_KG.getOrDefault(category, 0.3);
		};
	}

	static double co2(double kilograms, ProductCategory category) {
		return kilograms * CO2_PER_KG.getOrDefault(category, 2.0);
	}

	static double round1(double value) {
		return Math.round(value * 10) / 10.0;
	}

}
