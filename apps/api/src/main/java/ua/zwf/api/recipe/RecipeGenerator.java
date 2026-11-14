package ua.zwf.api.recipe;

import java.util.List;
import java.util.Optional;

/** B-22: «Згенерувати ідеальний рецепт» з 3–4 обраних продуктів. Порожньо — генератор недоступний або не впорався. */
public interface RecipeGenerator {

	Optional<Recipe.Details> generate(List<FridgeItem> selected);

}
