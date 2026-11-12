package ua.zwf.api.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-20…B-24 без AI-ключа: рекомендації й генерація з каталогу, деталі, «Приготувати і списати», «Врятовано». */
class RecipeIT extends IntegrationTest {

	static String add(ApiClient client, String name, String category, int daysLeft, int quantity, String unit) {
		var body = new HashMap<>(Products.product(name, category, daysLeft));
		body.put("quantity", quantity);
		body.put("unit", unit);
		return (String) Products.create(client, body).get("id");
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> list(Map<String, Object> json, String field) {
		return (List<Map<String, Object>>) json.get(field);
	}

	@Test
	void recommendedPutsCriticalProductsFirstAndIgnoresExpired() {
		var client = Accounts.signUp(client(), "Олена");
		add(client, "Шпинат Baby свіжий", "vegetables", 0, 150, "g");
		add(client, "Грецький йогурт 5%", "dairy", 1, 350, "g");
		add(client, "Сир твердий Гауда 45%", "dairy", 14, 320, "g");
		add(client, "Фарш яловичий", "meat", -1, 500, "g");

		var cards = client.get("/api/recipes/recommended").jsonList();

		assertThat(cards).isNotEmpty().hasSizeLessThanOrEqualTo(6);
		var first = cards.getFirst();
		assertThat(((Number) first.get("criticalCount")).intValue()).isGreaterThanOrEqualTo(2);
		assertThat(list(first, "fromFridge")).extracting(f -> f.get("name")).contains("Шпинат Baby свіжий", "Грецький йогурт 5%");
		// Прострочений фарш у рецепти не йде
		assertThat(cards).allSatisfy(c -> assertThat(list(c, "fromFridge")).extracting(f -> f.get("name")).doesNotContain("Фарш яловичий"));
		assertThat(first).containsKeys("id", "title", "minutes", "kcal", "difficulty", "matchPercent", "missing");
		assertThat(first.get("source")).isEqualTo("CATALOG");

		var byTime = client.get("/api/recipes/recommended?sort=time&limit=3").jsonList();
		assertThat(byTime).hasSizeLessThanOrEqualTo(3);
		assertThat(byTime).extracting(c -> ((Number) c.get("minutes")).intValue()).isSorted();

		assertThat(client().get("/api/recipes/recommended").status()).isEqualTo(401);
	}

	@Test
	void generateWithoutAiPicksTheBestCatalogRecipeAndValidates() {
		var client = Accounts.signUp(client(), "Олена");
		var spinach = add(client, "Шпинат Baby свіжий", "vegetables", 0, 150, "g");
		var yogurt = add(client, "Грецький йогурт 5%", "dairy", 1, 350, "g");
		var cheese = add(client, "Сир твердий Гауда 45%", "dairy", 14, 320, "g");
		var expired = add(client, "Молоко", "dairy", -2, 1, "l");

		var recipe = client.post("/api/recipes/generate", Map.of("productIds", List.of(spinach, yogurt, cheese)));
		assertThat(recipe.status()).as(recipe.body()).isEqualTo(200);
		var json = recipe.json();
		assertThat(json.get("source")).isEqualTo("CATALOG");
		assertThat(json.get("title")).isEqualTo("Теплий кіш без тіста зі шпинатом, йогуртом та сиром Гауда");
		assertThat(list(json, "fromFridge")).extracting(f -> f.get("productId")).containsExactlyInAnyOrder(spinach, yogurt, cheese);
		assertThat(list(json, "missing")).extracting(m -> m.get("name")).contains("Яйця курячі");
		assertThat(list(json, "missing").getFirst()).containsKey("substitutes");
		assertThat(list(json, "steps")).isNotEmpty();
		assertThat(list(json, "pantry")).isNotEmpty();

		var tooFew = client.post("/api/recipes/generate", Map.of("productIds", List.of(spinach, yogurt)));
		assertThat(tooFew.status()).isEqualTo(400);
		assertThat(tooFew.json()).containsEntry("errors", Map.of("productIds", "Size"));
		var withExpired = client.post("/api/recipes/generate", Map.of("productIds", List.of(spinach, yogurt, expired)));
		assertThat(withExpired.json()).containsEntry("errors", Map.of("productIds", "INVALID"));
		var foreign = Accounts.signUp(client(), "Чужий");
		assertThat(foreign.post("/api/recipes/generate", Map.of("productIds", List.of(spinach, yogurt, cheese))).json())
			.containsEntry("errors", Map.of("productIds", "INVALID"));
	}

	@Test
	void nothingMatchesMeans422() {
		var client = Accounts.signUp(client(), "Олена");
		var a = add(client, "Квас", "other", 3, 1, "l");
		var b = add(client, "Халва соняшникова", "other", 3, 200, "g");
		var c = add(client, "Мармелад", "other", 3, 100, "g");

		var response = client.post("/api/recipes/generate", Map.of("productIds", List.of(a, b, c)));

		assertThat(response.status()).isEqualTo(422);
		assertThat(response.json()).containsEntry("code", "NO_RECIPE");
	}

	@Test
	void cookWritesOffScaledQuantitiesAndCountsAsSaved() {
		var client = Accounts.signUp(client(), "Олена");
		var spinach = add(client, "Шпинат Baby свіжий", "vegetables", 0, 150, "g");
		var yogurt = add(client, "Грецький йогурт 5%", "dairy", 1, 1, "kg");
		var cheese = add(client, "Сир твердий Гауда 45%", "dairy", 14, 320, "g");
		var recipe = client.post("/api/recipes/generate", Map.of("productIds", List.of(spinach, yogurt, cheese))).json();
		var id = recipe.get("id");
		assertThat(client.get("/api/recipes/" + id).json().get("title")).isEqualTo(recipe.get("title"));

		// Рецепт на 4 порції: шпинат 150 г, йогурт 200 г, сир 100 г → на 2 порції — половина
		var cooked = client.post("/api/recipes/" + id + "/cook", Map.of("portions", 2));
		assertThat(cooked.status()).as(cooked.body()).isEqualTo(200);
		var byProduct = new HashMap<Object, Map<String, Object>>();
		list(cooked.json(), "cooked").forEach(c -> byProduct.put(c.get("productId"), c));
		assertThat(((Number) byProduct.get(spinach).get("quantity")).doubleValue()).isEqualTo(75.0);
		assertThat(((Number) byProduct.get(yogurt).get("quantity")).doubleValue()).isEqualTo(0.1);
		assertThat(byProduct.get(yogurt).get("unit")).isEqualTo("kg");
		assertThat(((Number) byProduct.get(cheese).get("quantity")).doubleValue()).isEqualTo(50.0);
		assertThat(((Number) client.get("/api/products/" + spinach).json().get("quantity")).doubleValue()).isEqualTo(75.0);

		// Решта шпинату — цілком (рецепт просить більше, ніж лишилось)
		var again = client.post("/api/recipes/" + id + "/cook", Map.of("portions", 4, "productIds", List.of(spinach)));
		assertThat(list(again.json(), "cooked")).singleElement().satisfies(c -> assertThat(c.get("closed")).isEqualTo(true));
		assertThat(client.get("/api/products/" + spinach).json().get("status")).isEqualTo("CONSUMED");

		assertThat(client.post("/api/recipes/" + id + "/cook", Map.of("portions", 13)).json())
			.containsEntry("errors", Map.of("portions", "Range"));

		var stats = client.get("/api/stats/saved?period=month").json();
		assertThat(stats).containsEntry("period", "month").containsEntry("saved", 3).containsEntry("wasted", 0);
		assertThat(stats.get("from")).isEqualTo(Products.TODAY.withDayOfMonth(1).toString());
	}

	@Test
	void unknownRecipeIs404AndStatsCountWasteSeparately() {
		var client = Accounts.signUp(client(), "Олена");
		assertThat(client.get("/api/recipes/00000000-0000-0000-0000-000000000000").json()).containsEntry("code", "RECIPE_NOT_FOUND");

		var milk = add(client, "Молоко", "dairy", 1, 1, "l");
		var bread = add(client, "Хліб", "other", 1, 1, "pcs");
		client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "WASTED"));
		client.post("/api/products/" + bread + "/write-off", Map.of("outcome", "EATEN"));

		assertThat(client.get("/api/stats/saved").json()).containsEntry("saved", 1).containsEntry("wasted", 1);
		assertThat(client.get("/api/stats/saved?period=year").status()).isEqualTo(400);
	}

}
