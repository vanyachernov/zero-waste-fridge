package ua.zwf.api.recipe;

import java.util.List;

/**
 * Рецепт проти вмісту холодильника.
 *
 * @param used інгредієнти, для яких знайшовся продукт
 * @param missing чого бракує (базове — сіль, олія — сюди не потрапляє)
 * @param pantry базові інгредієнти
 */
public record RecipeMatch(Recipe recipe, List<Used> used, List<RecipeIngredient> missing, List<RecipeIngredient> pantry) {

	public record Used(RecipeIngredient ingredient, FridgeItem product) {
	}

	/** % «збігу запасів»: частка небазових інгредієнтів, що вже є. */
	public int matchPercent() {
		int required = used.size() + missing.size();
		return required == 0 ? 0 : Math.round(100f * used.size() / required);
	}

	public long criticalCount() {
		return used.stream().filter(u -> u.product().critical()).count();
	}

	/** Найбільше критичних продуктів — вище; далі більший збіг і менше докуповувати. */
	public int score() {
		return (int) criticalCount() * 100 + matchPercent() - missing.size() * 3;
	}

}
