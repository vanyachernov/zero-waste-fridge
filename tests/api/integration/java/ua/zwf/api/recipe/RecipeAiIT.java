package ua.zwf.api.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;

/** B-22 з AI: фейковий DeepSeek повертає рецепт з тими продуктами, які йому передали. */
class RecipeAiIT extends IntegrationTest {

	static final JsonMapper JSON = JsonMapper.builder().build();

	static final Pattern ID = Pattern.compile("id: ([0-9a-f-]{36})");

	static HttpServer server;

	@DynamicPropertySource
	static void deepSeek(DynamicPropertyRegistry registry) throws IOException {
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/chat/completions", exchange -> {
			String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			var ids = new ArrayList<String>();
			ID.matcher(request).results().forEach(m -> ids.add(m.group(1)));
			var ingredients = new ArrayList<Object>();
			for (int i = 0; i < ids.size(); i++) {
				ingredients.add(Map.of("name", "Продукт " + (i + 1), "quantity", 1, "unit", "pcs", "fromFridge", ids.get(i)));
			}
			ingredients.add(Map.of("name", "Мускатний горіх", "note", "дрібка", "substitutes", List.of("паприка")));
			var recipe = Map.of("title", "Шеф-рецепт із залишків", "description", "AI", "minutes", 20, "servings", 2,
					"kcal", 300, "difficulty", "medium", "savingsUah", 120, "ingredients", ingredients, "steps",
					List.of(Map.of("title", "Крок 1", "text", "Змішайте все")));
			byte[] body = JSON.writeValueAsString(Map.of("choices",
					List.of(Map.of("message", Map.of("content", JSON.writeValueAsString(recipe)))))).getBytes(StandardCharsets.UTF_8);
			exchange.sendResponseHeaders(200, body.length);
			exchange.getResponseBody().write(body);
			exchange.close();
		});
		server.start();
		registry.add("zwf.ai.deepseek.api-key", () -> "sk-test");
		registry.add("zwf.ai.deepseek.base-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
	}

	@AfterAll
	static void stop() {
		server.stop(0);
	}

	@Test
	void generatedRecipeIsSavedForTheFamilyAndCanBeCooked() {
		var client = Accounts.signUp(client(), "Олена");
		var ids = new ArrayList<String>();
		for (var name : List.of("Шпинат", "Йогурт", "Гауда")) {
			ids.add((String) ua.zwf.api.support.Products.create(client, ua.zwf.api.support.Products.product(name, "other", 1)).get("id"));
		}

		var generated = client.post("/api/recipes/generate", Map.of("productIds", ids));
		assertThat(generated.status()).as(generated.body()).isEqualTo(200);
		var recipe = generated.json();
		assertThat(recipe).containsEntry("source", "AI").containsEntry("title", "Шеф-рецепт із залишків")
			.containsEntry("savingsUah", 120).containsEntry("matchPercent", 75);
		assertThat(RecipeIT.list(recipe, "fromFridge")).extracting(f -> f.get("productId")).containsExactlyElementsOf(ids);
		assertThat(RecipeIT.list(recipe, "missing")).singleElement().satisfies(m -> assertThat(m.get("substitutes")).isEqualTo(List.of("паприка")));

		var id = recipe.get("id");
		assertThat(client.get("/api/recipes/" + id).json()).containsEntry("source", "AI");
		// Згенерований рецепт бачить лише своя сім'я
		assertThat(Accounts.signUp(client(), "Чужий").get("/api/recipes/" + id).status()).isEqualTo(404);

		var cooked = client.post("/api/recipes/" + id + "/cook", Map.of());
		assertThat(RecipeIT.list(cooked.json(), "cooked")).hasSize(3).allSatisfy(c -> assertThat(c.get("closed")).isEqualTo(true));
	}

}
