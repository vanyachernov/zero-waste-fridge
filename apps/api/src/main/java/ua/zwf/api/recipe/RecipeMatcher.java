package ua.zwf.api.recipe;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * B-21: зіставляє інгредієнти з продуктами. Прострочене в рецепти не пропонуємо; з кількох підходящих продуктів
 * береться той, що зіпсується першим, і кожен продукт іде лише в один інгредієнт.
 */
public final class RecipeMatcher {

	private RecipeMatcher() {
	}

	public static RecipeMatch match(Recipe recipe, List<FridgeItem> fridge) {
		var candidates = fridge.stream()
			.filter(p -> p.daysLeft() >= 0)
			.sorted(Comparator.comparingLong(FridgeItem::daysLeft))
			.toList();
		Set<UUID> taken = new HashSet<>();
		List<RecipeMatch.Used> used = new ArrayList<>();
		List<RecipeIngredient> missing = new ArrayList<>();
		List<RecipeIngredient> pantry = new ArrayList<>();
		for (var ingredient : recipe.getIngredients()) {
			var product = candidates.stream().filter(p -> !taken.contains(p.id()) && p.matches(ingredient)).findFirst();
			if (product.isPresent()) {
				taken.add(product.get().id());
				used.add(new RecipeMatch.Used(ingredient, product.get()));
			}
			else if (ingredient.isPantry()) {
				pantry.add(ingredient);
			}
			else {
				missing.add(ingredient);
			}
		}
		return new RecipeMatch(recipe, List.copyOf(used), List.copyOf(missing), List.copyOf(pantry));
	}

}
