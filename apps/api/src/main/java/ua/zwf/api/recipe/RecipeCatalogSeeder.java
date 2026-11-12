package ua.zwf.api.recipe;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.product.Unit;

/**
 * B-20: каталог рецептів живе в {@code classpath:recipes/catalog.json} — його легко читати й доповнювати. На старті
 * додаються рецепти, яких ще немає в БД (за {@code slug}); наявні не чіпаємо.
 */
@Component
class RecipeCatalogSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(RecipeCatalogSeeder.class);

	static final String LOCATION = "recipes/catalog.json";

	private static final JsonMapper JSON = JsonMapper.builder().build();

	record CatalogFile(int version, List<CatalogRecipe> recipes) {
	}

	record CatalogRecipe(String slug, String title, String description, String imageUrl, int minutes, int kcal,
			int servings, String difficulty, Integer savingsUah, List<CatalogIngredient> ingredients,
			List<CatalogStep> steps) {
	}

	record CatalogIngredient(String name, BigDecimal quantity, String unit, List<String> keywords, String note,
			boolean pantry, List<String> substitutes) {
	}

	record CatalogStep(String title, String text) {
	}

	private final RecipeRepository recipes;

	private final TransactionTemplate tx;

	private final Clock clock;

	RecipeCatalogSeeder(RecipeRepository recipes, TransactionTemplate tx, Clock clock) {
		this.recipes = recipes;
		this.tx = tx;
		this.clock = clock;
	}

	@Override
	public void run(ApplicationArguments args) throws IOException {
		var catalog = read();
		tx.executeWithoutResult(status -> {
			var existing = recipes.catalogSlugs();
			var fresh = catalog.recipes().stream().filter(r -> !existing.contains(r.slug())).map(this::toRecipe).toList();
			recipes.saveAll(fresh);
			if (!fresh.isEmpty()) {
				log.info("Recipe catalog: {} recipe(s) added", fresh.size());
			}
		});
	}

	static CatalogFile read() throws IOException {
		try (InputStream in = new ClassPathResource(LOCATION).getInputStream()) {
			return JSON.readValue(in, CatalogFile.class);
		}
	}

	Recipe toRecipe(CatalogRecipe r) {
		var ingredients = r.ingredients()
			.stream()
			.map(i -> new RecipeIngredient(i.name(), i.quantity(), i.unit() == null ? null : Unit.fromCode(i.unit()),
					i.note(), i.keywords(), i.pantry(), i.substitutes(), null))
			.toList();
		var steps = r.steps().stream().map(s -> new RecipeStep(s.title(), s.text())).toList();
		return Recipe.catalog(r.slug(), new Recipe.Details(r.title(), r.description(), r.imageUrl(), r.minutes(), r.kcal(),
				r.servings(), Difficulty.parse(r.difficulty()), r.savingsUah(), ingredients, steps), clock.instant());
	}

}
