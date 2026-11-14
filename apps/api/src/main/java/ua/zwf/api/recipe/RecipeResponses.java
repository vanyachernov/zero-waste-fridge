package ua.zwf.api.recipe;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import ua.zwf.api.product.Unit;

/** Відповіді {@code /api/recipes}. Кількості — на {@code servings} порцій рецепта. */
public final class RecipeResponses {

	private RecipeResponses() {
	}

	/** «З вашого холодильника»: продукт і скільки його піде. */
	public record FromFridge(UUID productId, String name, BigDecimal quantity, Unit unit, String note, long daysLeft,
			BigDecimal available, Unit availableUnit) {

		static FromFridge of(RecipeMatch.Used used) {
			var i = used.ingredient();
			var p = used.product();
			return new FromFridge(p.id(), p.name(), Quantities.plain(i.getQuantity()), i.getUnit(), i.getNote(),
					p.daysLeft(), Quantities.plain(p.quantity()), p.unit());
		}

	}

	/** «Чого не вистачає (докупити або замінити)». */
	public record Missing(String name, BigDecimal quantity, Unit unit, String note, List<String> substitutes) {

		static Missing of(RecipeIngredient i) {
			return new Missing(i.getName(), Quantities.plain(i.getQuantity()), i.getUnit(), i.getNote(), i.getSubstitutes());
		}

	}

	public record Pantry(String name, String note) {
	}

	public record Step(String title, String text) {
	}

	/** Картка в «Рецепти з продуктів, що скоро зіпсуються» (B-21). */
	public record RecipeCard(UUID id, String title, String imageUrl, int minutes, int kcal, int servings,
			Difficulty difficulty, RecipeSource source, int matchPercent, long criticalCount, List<FromFridge> fromFridge,
			List<Missing> missing) {

		static RecipeCard of(RecipeMatch m) {
			var r = m.recipe();
			return new RecipeCard(r.getId(), r.getTitle(), r.getImageUrl(), r.getMinutes(), r.getKcal(), r.getServings(),
					r.getDifficulty(), r.getSource(), m.matchPercent(), m.criticalCount(),
					m.used().stream().map(FromFridge::of).toList(), m.missing().stream().map(Missing::of).toList());
		}

	}

	/** Детальний рецепт (B-22, {@code GET /api/recipes/{id}}). */
	public record RecipeDetail(UUID id, String title, String description, String imageUrl, int minutes, int kcal,
			int servings, Difficulty difficulty, RecipeSource source, Integer savingsUah, int matchPercent,
			long criticalCount, List<FromFridge> fromFridge, List<Missing> missing, List<Pantry> pantry, List<Step> steps) {

		static RecipeDetail of(RecipeMatch m) {
			var r = m.recipe();
			return new RecipeDetail(r.getId(), r.getTitle(), r.getDescription(), r.getImageUrl(), r.getMinutes(),
					r.getKcal(), r.getServings(), r.getDifficulty(), r.getSource(), r.getSavingsUah(), m.matchPercent(),
					m.criticalCount(), m.used().stream().map(FromFridge::of).toList(),
					m.missing().stream().map(Missing::of).toList(),
					m.pantry().stream().map(i -> new Pantry(i.getName(), i.getNote())).toList(),
					r.getSteps().stream().map(s -> new Step(s.getTitle(), s.getText())).toList());
		}

	}

	/** Результат «Приготувати і списати» (B-23). */
	public record CookResult(UUID recipeId, int portions, List<Cooked> cooked) {

		public record Cooked(UUID productId, String name, BigDecimal quantity, Unit unit, boolean closed) {
		}

	}

}
