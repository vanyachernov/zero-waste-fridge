package ua.zwf.api.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.product.Unit;

/** B-22: справжній HTTP проти локального «DeepSeek». */
class DeepSeekRecipeGeneratorTest {

	static final JsonMapper JSON = JsonMapper.builder().build();

	final FridgeItem spinach = new FridgeItem(UUID.randomUUID(), "Шпинат Baby свіжий", BigDecimal.valueOf(150), Unit.GRAMS, 0);

	final FridgeItem yogurt = new FridgeItem(UUID.randomUUID(), "Грецький йогурт 5%", BigDecimal.valueOf(350), Unit.GRAMS, 1);

	final FridgeItem cheese = new FridgeItem(UUID.randomUUID(), "Сир твердий Гауда 45%", BigDecimal.valueOf(320), Unit.GRAMS, 14);

	HttpServer server;

	final List<String> requests = new ArrayList<>();

	final List<String> authHeaders = new ArrayList<>();

	@AfterEach
	void stop() {
		if (server != null) {
			server.stop(0);
		}
	}

	/** Відповіді по черзі: [статус, тіло]. */
	DeepSeekRecipeGenerator serve(Object[]... responses) throws IOException {
		var n = new AtomicInteger();
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/chat/completions", exchange -> {
			requests.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			authHeaders.add(exchange.getRequestHeaders().getFirst("Authorization"));
			var r = responses[Math.min(n.getAndIncrement(), responses.length - 1)];
			byte[] bytes = ((String) r[1]).getBytes(StandardCharsets.UTF_8);
			exchange.sendResponseHeaders((int) r[0], bytes.length);
			exchange.getResponseBody().write(bytes);
			exchange.close();
		});
		server.start();
		return new DeepSeekRecipeGenerator(new DeepSeekProperties("sk-test",
				"http://127.0.0.1:" + server.getAddress().getPort() + "/", null, Duration.ofSeconds(5)));
	}

	String recipeJson(FridgeItem... used) {
		var ingredients = new ArrayList<Object>();
		for (var p : used) {
			ingredients.add(java.util.Map.of("name", p.name(), "quantity", 100, "unit", "g", "fromFridge", p.id().toString(),
					"pantry", false, "substitutes", List.of()));
		}
		ingredients.add(java.util.Map.of("name", "Яйця", "quantity", 3, "unit", "pcs", "pantry", false, "substitutes",
				List.of("аквафаба", "a|b")));
		ingredients.add(java.util.Map.of("name", "Сіль", "note", "за смаком", "pantry", true));
		var recipe = java.util.Map.of("title", "Кіш без тіста", "description", "Ніжна запіканка", "minutes", 30,
				"servings", 4, "kcal", 285, "difficulty", "easy", "savingsUah", 180, "ingredients", ingredients, "steps",
				List.of(java.util.Map.of("title", "Крок 1. Підготовка", "text", "Розігрійте духовку")));
		return completion(JSON.writeValueAsString(recipe));
	}

	static String completion(String content) {
		return JSON.writeValueAsString(java.util.Map.of("choices",
				List.of(java.util.Map.of("index", 0, "finish_reason", "stop", "message", java.util.Map.of("role", "assistant", "content", content)))));
	}

	@Test
	void buildsJsonModeRequestAndParsesTheRecipe() throws IOException {
		var generator = serve(new Object[] { 200, recipeJson(spinach, yogurt, cheese) });

		var details = generator.generate(List.of(spinach, yogurt, cheese)).orElseThrow();

		assertThat(details.title()).isEqualTo("Кіш без тіста");
		assertThat(details.servings()).isEqualTo(4);
		assertThat(details.savingsUah()).isEqualTo(180);
		assertThat(details.ingredients()).hasSize(5);
		assertThat(details.ingredients().get(0).getProductId()).isEqualTo(spinach.id());
		assertThat(details.ingredients().get(3).getSubstitutes()).containsExactly("аквафаба");
		assertThat(details.ingredients().get(4).isPantry()).isTrue();
		assertThat(details.ingredients().get(4).getQuantity()).isNull();

		assertThat(authHeaders).containsExactly("Bearer sk-test");
		var request = JSON.readTree(requests.getFirst());
		assertThat(request.path("model").asString()).isEqualTo("deepseek-flash");
		assertThat(request.path("response_format").path("type").asString()).isEqualTo("json_object");
		assertThat(request.path("thinking").path("type").asString()).isEqualTo("disabled");
		assertThat(request.path("messages").path(0).path("content").asString()).contains("json");
		assertThat(request.path("messages").path(1).path("content").asString()).contains(spinach.id().toString())
			.contains("Шпинат Baby свіжий");
	}

	@Test
	void blankContentAndServerErrorsAreRetriedOnce() throws IOException {
		var generator = serve(new Object[] { 200, completion("   ") }, new Object[] { 200, recipeJson(spinach, yogurt, cheese) });
		assertThat(generator.generate(List.of(spinach, yogurt, cheese))).isPresent();
		assertThat(requests).hasSize(2);
	}

	@Test
	void givesUpAfterTwoFailuresOrOnClientErrors() throws IOException {
		var overloaded = serve(new Object[] { 503, "{}" });
		assertThat(overloaded.generate(List.of(spinach, yogurt, cheese))).isEmpty();
		assertThat(requests).hasSize(DeepSeekRecipeGenerator.ATTEMPTS);
		stop();
		requests.clear();

		var noBalance = serve(new Object[] { 402, "{\"error\":{\"message\":\"Insufficient Balance\"}}" });
		assertThat(noBalance.generate(List.of(spinach, yogurt, cheese))).isEmpty();
		assertThat(requests).hasSize(1);
	}

	@Test
	void rejectsRecipesThatSkipSelectedProductsOrBreakLimits() {
		// Сир не використано — це не той рецепт
		assertThat(DeepSeekRecipeGenerator.parse(recipeJson(spinach, yogurt), List.of(spinach, yogurt, cheese))).isEmpty();
		assertThat(DeepSeekRecipeGenerator.parse(completion("{\"title\":\"x\",\"minutes\":0}"), List.of(spinach))).isEmpty();
		assertThat(DeepSeekRecipeGenerator.parse(completion("не json"), List.of(spinach))).isEmpty();
		assertThat(DeepSeekRecipeGenerator.parse("{}", List.of(spinach))).isEmpty();
	}

	@Test
	void disabledWithoutKey() {
		var generator = new DeepSeekRecipeGenerator(new DeepSeekProperties(" ", null, null, null));
		assertThat(generator.generate(List.of(spinach))).isEmpty();
	}

}
