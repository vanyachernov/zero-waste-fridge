package ua.zwf.api.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import ua.zwf.api.product.Unit;

class RecipeMatcherTest {

	static RecipeIngredient ing(String name, int qty, Unit unit, String... keywords) {
		return new RecipeIngredient(name, BigDecimal.valueOf(qty), unit, null, List.of(keywords), false, List.of("заміна"), null);
	}

	static RecipeIngredient pantry(String name) {
		return new RecipeIngredient(name, null, null, "за смаком", List.of(name.toLowerCase()), true, List.of(), null);
	}

	static FridgeItem item(String name, long daysLeft) {
		return new FridgeItem(UUID.randomUUID(), name, BigDecimal.valueOf(500), Unit.GRAMS, daysLeft);
	}

	static Recipe recipe(RecipeIngredient... ingredients) {
		return Recipe.catalog("test", new Recipe.Details("Кіш", null, null, 30, 285, 4, Difficulty.EASY, 180,
				List.of(ingredients), List.of(new RecipeStep("Крок 1", "Готуйте"))), Instant.EPOCH);
	}

	@Test
	void matchesByKeywordsPicksTheMostUrgentAndSkipsExpired() {
		var spinachOld = item("Шпинат Baby свіжий", 0);
		var spinachNew = item("Шпинат заморожений", 30);
		var expiredYogurt = item("Грецький йогурт 5%", -1);
		var cheese = item("Сир твердий Гауда 45%", 14);
		var r = recipe(ing("Шпинат", 150, Unit.GRAMS, "шпинат"), ing("Йогурт", 200, Unit.GRAMS, "йогурт"),
				ing("Сир", 100, Unit.GRAMS, "гауда"), ing("Яйця", 3, Unit.PIECES, "яйц"), pantry("Сіль"));

		var m = RecipeMatcher.match(r, List.of(spinachNew, cheese, expiredYogurt, spinachOld));

		assertThat(m.used()).extracting(u -> u.product().name()).containsExactly("Шпинат Baby свіжий", "Сир твердий Гауда 45%");
		assertThat(m.missing()).extracting(RecipeIngredient::getName).containsExactly("Йогурт", "Яйця");
		assertThat(m.pantry()).extracting(RecipeIngredient::getName).containsExactly("Сіль");
		assertThat(m.matchPercent()).isEqualTo(50);
		assertThat(m.criticalCount()).isEqualTo(1);
		assertThat(m.score()).isEqualTo(100 + 50 - 6);
	}

	@Test
	void oneProductCoversOneIngredientAndAiRecipesLinkById() {
		var milk = item("Молоко 2.5%", 3);
		var linked = new RecipeIngredient("Що завгодно", BigDecimal.ONE, Unit.LITERS, null, List.of("нічого"), false, List.of(), milk.id());
		var r = recipe(linked, ing("Ще молоко", 100, Unit.MILLILITERS, "молоко"));

		var m = RecipeMatcher.match(r, List.of(milk));

		assertThat(m.used()).hasSize(1);
		assertThat(m.used().getFirst().ingredient().getName()).isEqualTo("Що завгодно");
		assertThat(m.missing()).extracting(RecipeIngredient::getName).containsExactly("Ще молоко");
	}

	@Test
	void ingredientKeepsKeywordsAndSubstitutesNormalised() {
		var i = new RecipeIngredient("Яйця", null, Unit.PIECES, "3 шт", List.of(" Яйц ", ""), false, List.of("аквафаба", "льон"), null);
		assertThat(i.getKeywords()).containsExactly("яйц");
		assertThat(i.getSubstitutes()).containsExactly("аквафаба", "льон");
		// Кількість без одиниці (і навпаки) не зберігаємо
		assertThat(i.getQuantity()).isNull();
		assertThat(i.getUnit()).isNull();
	}

	@ParameterizedTest(name = "{0} {1} → {3} {2}")
	@CsvSource({ "200, g, kg, 0.2", "1.5, kg, g, 1500", "250, ml, l, 0.25", "2, l, ml, 2000", "3, pcs, pcs, 3" })
	void convertsCompatibleUnits(String qty, String from, String to, String expected) {
		assertThat(Quantities.convert(new BigDecimal(qty), Unit.fromCode(from), Unit.fromCode(to)))
			.hasValueSatisfying(v -> assertThat(v).isEqualByComparingTo(expected));
	}

	@Test
	void incompatibleUnitsAndScaling() {
		assertThat(Quantities.convert(BigDecimal.TEN, Unit.PIECES, Unit.GRAMS)).isEmpty();
		assertThat(Quantities.convert(null, Unit.GRAMS, Unit.GRAMS)).isEmpty();
		assertThat(Quantities.scale(BigDecimal.valueOf(150), 4, 2)).isEqualByComparingTo("75");
		assertThat(Quantities.scale(BigDecimal.valueOf(100), 3, 1)).isEqualByComparingTo("33.333");
		assertThat(Quantities.scale(null, 4, 2)).isNull();
		assertThat(Quantities.plain(new BigDecimal("200.000"))).hasToString("200");
		assertThat(Quantities.plain(new BigDecimal("0.250"))).hasToString("0.25");
	}

	@Test
	void catalogFileIsValid() throws Exception {
		var catalog = RecipeCatalogSeeder.read();
		assertThat(catalog.recipes()).hasSizeGreaterThanOrEqualTo(30);
		assertThat(catalog.recipes()).extracting(RecipeCatalogSeeder.CatalogRecipe::slug).doesNotHaveDuplicates();
		for (var r : catalog.recipes()) {
			assertThat(r.title()).as(r.slug()).isNotBlank();
			assertThat(r.servings()).as(r.slug()).isBetween(1, 12);
			assertThat(r.minutes()).as(r.slug()).isBetween(1, 600);
			assertThat(r.steps()).as(r.slug()).isNotEmpty();
			assertThat(r.ingredients()).as(r.slug()).anyMatch(i -> !i.pantry());
			assertThat(Difficulty.parse(r.difficulty())).as(r.slug()).isNotNull();
			for (var i : r.ingredients()) {
				assertThat(i.keywords()).as(r.slug() + " / " + i.name()).isNotEmpty();
				assertThat(i.quantity() == null).as(r.slug() + " / " + i.name()).isEqualTo(i.unit() == null);
				if (i.unit() != null) {
					assertThat(Unit.fromCode(i.unit())).isNotNull();
				}
			}
		}
	}

}
