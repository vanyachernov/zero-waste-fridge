package ua.zwf.api.recipe;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.product.Unit;

/**
 * B-22: рецепт від DeepSeek (OpenAI-сумісний {@code POST /chat/completions}, JSON mode). Відповідь моделі не довіряємо:
 * перевіряємо поля й межі, обрані продукти мусять бути в рецепті. Порожній або кривий JSON, 429 і 5xx — одна повторна
 * спроба, далі {@link Optional#empty()} (сервіс підбере рецепт із каталогу).
 */
@Component
class DeepSeekRecipeGenerator implements RecipeGenerator {

	private static final Logger log = LoggerFactory.getLogger(DeepSeekRecipeGenerator.class);

	private static final JsonMapper JSON = JsonMapper.builder().build();

	static final int ATTEMPTS = 2;

	private final DeepSeekProperties properties;

	private final HttpClient http;

	DeepSeekRecipeGenerator(DeepSeekProperties properties) {
		this.properties = properties;
		this.http = HttpClient.newBuilder().connectTimeout(properties.timeout()).build();
	}

	@Override
	public Optional<Recipe.Details> generate(List<FridgeItem> selected) {
		if (!properties.enabled()) {
			return Optional.empty();
		}
		String body = JSON.writeValueAsString(request(selected));
		for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
			try {
				var response = http.send(HttpRequest.newBuilder(URI.create(properties.baseUrl() + "/chat/completions"))
					.timeout(properties.timeout())
					.header("Authorization", "Bearer " + properties.apiKey())
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(body))
					.build(), HttpResponse.BodyHandlers.ofString());
				int status = response.statusCode();
				if (status == 200) {
					var recipe = parse(response.body(), selected);
					if (recipe.isPresent()) {
						return recipe;
					}
					log.warn("DeepSeek: unusable recipe JSON (attempt {})", attempt);
				}
				else if (status == 429 || status >= 500) {
					log.warn("DeepSeek: HTTP {} (attempt {})", status, attempt);
				}
				else {
					// 400/401/402/422 — повтор не допоможе (ключ, баланс, параметри)
					log.error("DeepSeek: HTTP {} — {}", status, abbreviate(response.body()));
					return Optional.empty();
				}
			}
			catch (IOException ex) {
				log.warn("DeepSeek: {} (attempt {})", ex.toString(), attempt);
			}
			catch (InterruptedException ex) {
				Thread.currentThread().interrupt();
				return Optional.empty();
			}
		}
		return Optional.empty();
	}

	Map<String, Object> request(List<FridgeItem> selected) {
		String products = selected.stream()
			.map(p -> "- id: %s; назва: %s; є: %s %s; днів до кінця терміну: %d".formatted(p.id(), p.name(),
					Quantities.plain(p.quantity()).toPlainString(), p.unit().code(), p.daysLeft()))
			.collect(Collectors.joining("\n"));
		return Map.of("model", properties.model(), "thinking", Map.of("type", "disabled"), "temperature", 0.7,
				"max_tokens", 2500, "response_format", Map.of("type", "json_object"), "messages",
				List.of(Map.of("role", "system", "content", SYSTEM), Map.of("role", "user", "content",
						"Продукти з холодильника, які треба використати першочергово:\n" + products)));
	}

	static final String SYSTEM = """
			Ти — шеф-кухар застосунку Zero Waste Fridge, що допомагає не викидати їжу. Склади один домашній рецепт \
			українською мовою, який використовує УСІ надані продукти з холодильника (у розумних кількостях, не більше, \
			ніж є). Можна додати до 6 інших інгредієнтів, які зазвичай є вдома або легко купити. Базові речі (сіль, \
			перець, олія, вода, цукор, спеції) познач "pantry": true.
			Відповідай лише валідним JSON-об'єктом (json) такої форми:
			{
			  "title": "Теплий кіш без тіста зі шпинатом і сиром",
			  "description": "1–2 речення, чим страва хороша",
			  "minutes": 30,
			  "servings": 4,
			  "kcal": 285,
			  "difficulty": "easy",
			  "savingsUah": 180,
			  "ingredients": [
			    {"name": "Шпинат", "quantity": 150, "unit": "g", "note": "використати негайно", "fromFridge": "<id продукту>", "pantry": false, "substitutes": []},
			    {"name": "Яйця курячі", "quantity": 3, "unit": "pcs", "note": null, "fromFridge": null, "pantry": false, "substitutes": ["аквафаба"]},
			    {"name": "Сіль", "quantity": null, "unit": null, "note": "за смаком", "fromFridge": null, "pantry": true, "substitutes": []}
			  ],
			  "steps": [{"title": "Крок 1. Підготовка", "text": "Що зробити"}]
			}
			Правила: kcal — на одну порцію; difficulty — easy, medium або hard; unit — g, kg, ml, l або pcs (або null разом \
			із quantity: null); fromFridge — точний id наданого продукту або null; кожен наданий продукт рівно один раз; \
			3–7 кроків; savingsUah — орієнтовна вартість використаних продуктів із холодильника в гривнях.""";

	/** Розбір і перевірка відповіді моделі. */
	static Optional<Recipe.Details> parse(String body, List<FridgeItem> selected) {
		try {
			JsonNode root = JSON.readTree(body);
			JsonNode message = root.path("choices").path(0).path("message").path("content");
			String content = message.isString() ? message.asString() : "";
			if (content.isBlank()) {
				return Optional.empty();
			}
			return toDetails(JSON.readTree(content), selected);
		}
		catch (RuntimeException ex) {
			return Optional.empty();
		}
	}

	static Optional<Recipe.Details> toDetails(JsonNode r, List<FridgeItem> selected) {
		String title = text(r, "title", 160);
		int minutes = r.path("minutes").asInt(0);
		int servings = r.path("servings").asInt(0);
		int kcal = r.path("kcal").asInt(-1);
		Difficulty difficulty;
		try {
			difficulty = Difficulty.parse(r.path("difficulty").isString() ? r.path("difficulty").asString() : "medium");
		}
		catch (IllegalArgumentException ex) {
			difficulty = Difficulty.MEDIUM;
		}
		if (title == null || minutes < 1 || minutes > 600 || servings < 1 || servings > 12 || kcal < 0 || kcal > 5000) {
			return Optional.empty();
		}
		Map<String, FridgeItem> byId = selected.stream().collect(Collectors.toMap(p -> p.id().toString(), p -> p));
		List<RecipeIngredient> ingredients = new ArrayList<>();
		java.util.Set<UUID> usedProducts = new java.util.HashSet<>();
		for (JsonNode i : r.path("ingredients")) {
			String name = text(i, "name", 120);
			if (name == null) {
				return Optional.empty();
			}
			BigDecimal quantity = i.path("quantity").isNumber() ? i.path("quantity").decimalValue() : null;
			Unit unit = null;
			String unitCode = i.path("unit").isString() ? i.path("unit").asString() : "";
			if (quantity != null && !unitCode.isBlank()) {
				try {
					unit = Unit.fromCode(unitCode.strip().toLowerCase(Locale.ROOT));
				}
				catch (IllegalArgumentException ex) {
					quantity = null;
				}
			}
			if (quantity == null || quantity.signum() <= 0 || unit == null) {
				quantity = null;
				unit = null;
			}
			var product = i.path("fromFridge").isString() ? byId.get(i.path("fromFridge").asString().strip()) : null;
			if (product != null && !usedProducts.add(product.id())) {
				product = null;
			}
			List<String> substitutes = new ArrayList<>();
			for (JsonNode s : i.path("substitutes")) {
				String sub = s.isString() ? s.asString().strip() : "";
				if (!sub.isEmpty() && !sub.contains("|") && substitutes.size() < 3) {
					substitutes.add(sub.length() > 60 ? sub.substring(0, 60) : sub);
				}
			}
			List<String> keywords = product != null ? List.of(firstWord(product.name())) : List.of(firstWord(name));
			ingredients.add(new RecipeIngredient(name, quantity, unit, text(i, "note", 120), keywords,
					product == null && i.path("pantry").asBoolean(false), substitutes,
					product == null ? null : product.id()));
		}
		List<RecipeStep> steps = new ArrayList<>();
		for (JsonNode s : r.path("steps")) {
			String text = text(s, "text", 1000);
			if (text != null) {
				steps.add(new RecipeStep(text(s, "title", 120), text));
			}
		}
		// Усі обрані продукти мають бути в рецепті — інакше це не той рецепт, який просили
		if (usedProducts.size() != selected.size() || ingredients.size() > 25 || steps.isEmpty() || steps.size() > 15) {
			return Optional.empty();
		}
		int savings = r.path("savingsUah").asInt(0);
		return Optional.of(new Recipe.Details(title, text(r, "description", 600), null, minutes, kcal, servings,
				difficulty, savings > 0 && savings < 100_000 ? savings : null, ingredients, steps));
	}

	private static String text(JsonNode node, String field, int max) {
		JsonNode v = node.path(field);
		if (!v.isString()) {
			return null;
		}
		String value = v.asString().strip();
		if (value.isEmpty()) {
			return null;
		}
		return value.length() > max ? value.substring(0, max) : value;
	}

	private static String firstWord(String name) {
		String word = name.strip().split("\\s+")[0].toLowerCase(Locale.ROOT);
		return word.length() > 5 ? word.substring(0, word.length() - 1) : word;
	}

	private static String abbreviate(String body) {
		return body == null || body.length() <= 300 ? body : body.substring(0, 300) + "…";
	}

}
