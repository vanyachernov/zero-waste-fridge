package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;

/** B-11: CRUD /api/products у межах домогосподарства. */
class ProductsIT extends IntegrationTest {

	static final LocalDate TODAY = LocalDate.now(ZoneId.of("Europe/Kyiv"));

	static Map<String, Object> product(String name, String category, int daysLeft) {
		var body = new HashMap<String, Object>();
		body.put("name", name);
		body.put("category", category);
		body.put("quantity", 1);
		body.put("unit", "pcs");
		body.put("expiresAt", TODAY.plusDays(daysLeft).toString());
		return body;
	}

	static Map<String, Object> create(ApiClient client, Map<String, Object> body) {
		var response = client.post("/api/products", body);
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json();
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> items(ApiClient.Response response) {
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return (List<Map<String, Object>>) response.json().get("items");
	}

	static List<Object> names(ApiClient.Response response) {
		return items(response).stream().map(i -> i.get("name")).toList();
	}

	@SuppressWarnings("unchecked")
	static Map<String, Object> errors(ApiClient.Response response) {
		assertThat(response.status()).as(response.body()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "VALIDATION_FAILED");
		return (Map<String, Object>) response.json().get("errors");
	}

	@Test
	void requiresSessionAndCsrf() {
		assertThat(client().get("/api/products").status()).isEqualTo(401);

		var client = Accounts.signUp(client(), "Олена");
		assertThat(client.postRaw("/api/products", product("Молоко", "dairy", 3), null).status()).isEqualTo(403);
	}

	@Test
	void createsProductWithDefaultsAndComputedFreshness() {
		var client = Accounts.signUp(client(), "Олена Кравченко");
		var body = product("  Грецький   йогурт 5% ", "dairy", 1);
		body.put("brand", "ТМ Галичина");
		body.put("quantity", 350);
		body.put("unit", "g");
		body.put("purchasedAt", TODAY.minusDays(1).toString());

		var response = client.post("/api/products", body);

		assertThat(response.status()).isEqualTo(201);
		var json = response.json();
		assertThat(response.headers().firstValue("Location")).hasValue("/api/products/" + json.get("id"));
		assertThat(json).containsEntry("name", "Грецький йогурт 5%")
			.containsEntry("brand", "ТМ Галичина")
			.containsEntry("category", "dairy")
			.containsEntry("zone", "middle") // типова зона категорії
			.containsEntry("quantity", 350)
			.containsEntry("unit", "g")
			.containsEntry("purchasedAt", TODAY.minusDays(1).toString())
			.containsEntry("expiresAt", TODAY.plusDays(1).toString())
			.containsEntry("effectiveExpiresAt", TODAY.plusDays(1).toString())
			.containsEntry("openedAt", null)
			.containsEntry("daysLeft", 1)
			.containsEntry("freshness", "soon")
			.containsEntry("remindBeforeDays", 2)
			.containsEntry("status", "ACTIVE");
		@SuppressWarnings("unchecked")
		var author = (Map<String, Object>) json.get("addedBy");
		assertThat(author).containsEntry("name", "Олена Кравченко");

		assertThat(client.get("/api/products/" + json.get("id")).json()).isEqualTo(json);
	}

	@Test
	void openedPackageShortensExpiry() {
		var client = Accounts.signUp(client(), "Олена");
		var body = product("Молоко пастеризоване", "dairy", 10);
		body.put("openedAt", TODAY.toString());

		var json = create(client, body);

		assertThat(json).containsEntry("openedShelfLifeDays", 3)
			.containsEntry("effectiveExpiresAt", TODAY.plusDays(3).toString())
			.containsEntry("daysLeft", 3)
			.containsEntry("freshness", "fresh");
	}

	@Test
	void validationErrorsUseFieldCodes() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(errors(client.post("/api/products", Map.of("name", " ", "quantity", 0, "remindBeforeDays", 4))))
			.containsEntry("name", "NotBlank")
			.containsEntry("quantity", "Positive")
			.containsEntry("remindBeforeDays", "NOT_ALLOWED")
			.containsEntry("category", "NotNull")
			.containsEntry("expiresAt", "NotNull");

		var unknownCode = product("Риба", "fish", 1);
		assertThat(errors(client.post("/api/products", unknownCode))).isEqualTo(Map.of("category", "INVALID"));

		var badDate = product("Риба", "meat", 1);
		badDate.put("expiresAt", "завтра");
		assertThat(errors(client.post("/api/products", badDate))).isEqualTo(Map.of("expiresAt", "INVALID"));

		var broken = client.postJson("/api/products", "{\"name\": ");
		assertThat(broken.status()).isEqualTo(400);
		assertThat(broken.json()).containsEntry("code", "MALFORMED_REQUEST");
	}

	@Test
	void otherHouseholdSeesNothing() {
		var olena = Accounts.signUp(client(), "Олена");
		var id = create(olena, product("Сир", "dairy", 5)).get("id");
		var stranger = Accounts.signUp(client(), "Сусід");

		var get = stranger.get("/api/products/" + id);
		assertThat(get.status()).isEqualTo(404);
		assertThat(get.json()).containsEntry("code", "PRODUCT_NOT_FOUND");
		assertThat(stranger.patch("/api/products/" + id, Map.of("name", "Моє")).status()).isEqualTo(404);
		assertThat(items(stranger.get("/api/products"))).isEmpty();
		assertThat(olena.get("/api/products/00000000-0000-0000-0000-000000000000").status()).isEqualTo(404);
	}

	@Test
	void listSortsByUrgencyAndPaginates() {
		var client = Accounts.signUp(client(), "Олена");
		create(client, product("Авокадо", "vegetables", 7));
		create(client, product("Фарш", "meat", -1));
		create(client, product("Шпинат", "vegetables", 0));
		create(client, product("Йогурт", "dairy", 1));
		create(client, product("Банан", "fruits", 1));

		assertThat(names(client.get("/api/products"))).containsExactly("Фарш", "Шпинат", "Банан", "Йогурт", "Авокадо");
		assertThat(names(client.get("/api/products?sort=name"))).containsExactly("Авокадо", "Банан", "Йогурт", "Фарш",
				"Шпинат");
		assertThat(names(client.get("/api/products?sort=added"))).first().isEqualTo("Банан");
		assertThat(names(client.get("/api/products?sort=category"))).containsExactly("Йогурт", "Банан", "Фарш",
				"Шпинат", "Авокадо");

		var page2 = client.get("/api/products?size=2&page=2");
		assertThat(names(page2)).containsExactly("Банан", "Йогурт");
		assertThat(page2.json()).containsEntry("page", 2)
			.containsEntry("size", 2)
			.containsEntry("total", 5)
			.containsEntry("totalPages", 3);
		assertThat(items(client.get("/api/products?size=2&page=9"))).isEmpty();
	}

	@Test
	void filtersBySearchCategoryAndFreshnessWithCategoryCounts() {
		var client = Accounts.signUp(client(), "Олена");
		var yogurt = product("Грецький йогурт", "dairy", 1);
		yogurt.put("brand", "Галичина 50%");
		create(client, yogurt);
		create(client, product("Молоко", "dairy", 5));
		create(client, product("Фарш яловичий", "meat", -2));
		create(client, product("Шпинат", "vegetables", 0));

		assertThat(names(client.get("/api/products?q=ЙОГУРТ"))).containsExactly("Грецький йогурт");
		assertThat(names(client.get("/api/products?q=галичина"))).containsExactly("Грецький йогурт");
		assertThat(names(client.get("/api/products?q=50%25"))).containsExactly("Грецький йогурт");
		assertThat(names(client.get("/api/products?q=_"))).isEmpty();
		assertThat(names(client.get("/api/products?category=dairy&category=meat"))).containsExactly("Фарш яловичий",
				"Грецький йогурт", "Молоко");
		assertThat(names(client.get("/api/products?freshness=expired,today"))).containsExactly("Фарш яловичий",
				"Шпинат");
		assertThat(names(client.get("/api/products?freshness=soon"))).containsExactly("Грецький йогурт");
		assertThat(names(client.get("/api/products?freshness=fresh"))).containsExactly("Молоко");

		// Лічильники чіпів: враховують пошук і термін, але не вибрану категорію
		var filtered = client.get("/api/products?category=meat&freshness=soon,fresh");
		assertThat(names(filtered)).isEmpty();
		assertThat(filtered.json().get("categoryCounts")).isEqualTo(Map.of("vegetables", 0, "dairy", 2, "meat", 0,
				"fruits", 0, "sauces", 0, "other", 0));
	}

	@Test
	void invalidQueryParamsAre400WithFieldCodes() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(errors(client.get("/api/products?sort=price"))).isEqualTo(Map.of("sort", "INVALID"));
		assertThat(errors(client.get("/api/products?category=fish"))).isEqualTo(Map.of("category", "INVALID"));
		assertThat(errors(client.get("/api/products?page=0&size=500"))).isEqualTo(Map.of("page", "Min", "size", "Range"));
	}

	@Test
	void patchChangesOnlySentFieldsAndNullClears() {
		var client = Accounts.signUp(client(), "Олена");
		var body = product("Сир твердий Гауда", "dairy", 20);
		body.put("brand", "Брусок");
		body.put("purchasedAt", TODAY.minusDays(1).toString());
		var id = create(client, body).get("id");

		var patch = new HashMap<String, Object>();
		patch.put("quantity", 0.32);
		patch.put("unit", "kg");
		patch.put("brand", null);
		patch.put("remindBeforeDays", 7);
		var updated = client.patch("/api/products/" + id, patch);

		assertThat(updated.status()).as(updated.body()).isEqualTo(200);
		assertThat(updated.json()).containsEntry("name", "Сир твердий Гауда")
			.containsEntry("brand", null)
			.containsEntry("quantity", 0.32)
			.containsEntry("unit", "kg")
			.containsEntry("remindBeforeDays", 7)
			.containsEntry("purchasedAt", TODAY.minusDays(1).toString());

		var opened = client.patch("/api/products/" + id, Map.of("openedAt", TODAY.toString())).json();
		assertThat(opened).containsEntry("openedShelfLifeDays", 14)
			.containsEntry("effectiveExpiresAt", TODAY.plusDays(14).toString());

		var unopenBody = new HashMap<String, Object>();
		unopenBody.put("openedAt", null);
		var unopened = client.patch("/api/products/" + id, unopenBody).json();
		assertThat(unopened).containsEntry("openedAt", null)
			.containsEntry("openedShelfLifeDays", null)
			.containsEntry("effectiveExpiresAt", TODAY.plusDays(20).toString());

		var clearRequired = new HashMap<String, Object>();
		clearRequired.put("name", null);
		clearRequired.put("expiresAt", TODAY.minusDays(5).toString());
		assertThat(errors(client.patch("/api/products/" + id, clearRequired))).isEqualTo(
				Map.of("name", "NotNull", "expiresAt", "BEFORE_PURCHASE"));
	}

}
