package ua.zwf.api.tip;

import java.util.Map;
import ua.zwf.api.product.ProductCategory;

/** Шаблонна ідея страви за переважною категорією продуктів (перша версія B-15; далі — AI, B-22). */
public enum RecipeHint {

	SALAD, PANCAKES, STIR_FRY, SMOOTHIE, PASTA, OMELETTE;

	private static final Map<ProductCategory, RecipeHint> BY_CATEGORY = Map.of(
			ProductCategory.VEGETABLES, SALAD,
			ProductCategory.DAIRY, PANCAKES,
			ProductCategory.MEAT, STIR_FRY,
			ProductCategory.FRUITS, SMOOTHIE,
			ProductCategory.SAUCES, PASTA,
			ProductCategory.OTHER, OMELETTE);

	public static RecipeHint forCategory(ProductCategory category) {
		return BY_CATEGORY.get(category);
	}

}
