package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-40: CRUD /api/shopping-list, toggle і зв'язок зі списанням (B-13). */
class ShoppingListIT extends IntegrationTest {

	static Map<String, Object> add(ApiClient client, Map<String, Object> body) {
		var response = client.post("/api/shopping-list", body);
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json();
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> section(ApiClient client, String name) {
		var response = client.get("/api/shopping-list");
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return (List<Map<String, Object>>) response.json().get(name);
	}

	static List<Object> names(List<Map<String, Object>> items) {
		return items.stream().map(i -> i.get("name")).toList();
	}

	@SuppressWarnings("unchecked")
	static Map<String, Object> errors(ApiClient.Response response) {
		assertThat(response.status()).as(response.body()).isEqualTo(400);
		return (Map<String, Object>) response.json().get("errors");
	}

	@Test
	void requiresSession() {
		assertThat(client().get("/api/shopping-list").status()).isEqualTo(401);
	}

	@Test
	void addsItemsWithDefaultsAndAuthor() {
		var client = Accounts.signUp(client(), "Максим Кравченко");

		var response = client.post("/api/shopping-list", Map.of("name", " Молоко  2.5% ", "quantity", 2, "unit", "l",
				"category", "dairy", "priceEstimate", 74.5));

		assertThat(response.status()).isEqualTo(201);
		var json = response.json();
		assertThat(response.headers().firstValue("Location")).hasValue("/api/shopping-list/" + json.get("id"));
		assertThat(json).containsEntry("name", "Молоко 2.5%")
			.containsEntry("quantity", 2)
			.containsEntry("unit", "l")
			.containsEntry("category", "dairy")
			.containsEntry("priority", "NORMAL")
			.containsEntry("priceEstimate", 74.5)
			.containsEntry("source", "MANUAL")
			.containsEntry("sourceProduct", null)
			.containsEntry("bought", false)
			.containsEntry("boughtBy", null);
		@SuppressWarnings("unchecked")
		var author = (Map<String, Object>) json.get("addedBy");
		assertThat(author).containsEntry("name", "Максим Кравченко");

		assertThat(add(client, Map.of("name", "Хліб"))).containsEntry("quantity", null).containsEntry("unit", null);
	}

	@Test
	void validation() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(errors(client.post("/api/shopping-list", Map.of("name", " ", "quantity", 1))))
			.isEqualTo(Map.of("name", "NotBlank", "unit", "NotNull"));
		assertThat(errors(client.post("/api/shopping-list", Map.of("name", "Риба", "category", "fish"))))
			.isEqualTo(Map.of("category", "INVALID"));
		assertThat(errors(client.post("/api/shopping-list", Map.of("name", "Риба", "priority", "URGENT"))))
			.isEqualTo(Map.of("priority", "INVALID"));
	}

	@Test
	void toggleMovesBetweenSectionsInOrder() {
		var client = Accounts.signUp(client(), "Олена");
		var bread = add(client, Map.of("name", "Хліб")).get("id");
		var milk = add(client, Map.of("name", "Молоко")).get("id");
		add(client, Map.of("name", "Яйця", "priority", "HIGH"));

		assertThat(names(section(client, "toBuy"))).containsExactly("Яйця", "Хліб", "Молоко");

		var bought = client.post("/api/shopping-list/" + bread + "/toggle", null);
		assertThat(bought.status()).isEqualTo(200);
		assertThat(bought.json()).containsEntry("bought", true);
		assertThat(bought.json().get("boughtAt")).isNotNull();
		@SuppressWarnings("unchecked")
		var buyer = (Map<String, Object>) bought.json().get("boughtBy");
		assertThat(buyer).containsEntry("name", "Олена");
		client.post("/api/shopping-list/" + milk + "/toggle", null);

		assertThat(names(section(client, "toBuy"))).containsExactly("Яйця");
		assertThat(names(section(client, "bought"))).containsExactly("Молоко", "Хліб");

		var undone = client.post("/api/shopping-list/" + bread + "/toggle", null).json();
		assertThat(undone).containsEntry("bought", false).containsEntry("boughtAt", null).containsEntry("boughtBy", null);
		assertThat(names(section(client, "toBuy"))).containsExactly("Яйця", "Хліб");
	}

	@Test
	void patchAndDelete() {
		var client = Accounts.signUp(client(), "Олена");
		var id = add(client, Map.of("name", "Сир", "quantity", 1, "unit", "pcs", "priceEstimate", 120)).get("id");

		var patch = new HashMap<String, Object>();
		patch.put("quantity", 3);
		patch.put("priority", "HIGH");
		patch.put("priceEstimate", null);
		var updated = client.patch("/api/shopping-list/" + id, patch);

		assertThat(updated.status()).as(updated.body()).isEqualTo(200);
		assertThat(updated.json()).containsEntry("quantity", 3)
			.containsEntry("unit", "pcs")
			.containsEntry("priority", "HIGH")
			.containsEntry("priceEstimate", null)
			.containsEntry("name", "Сир");

		var clear = new HashMap<String, Object>();
		clear.put("quantity", null);
		clear.put("unit", null);
		assertThat(client.patch("/api/shopping-list/" + id, clear).json()).containsEntry("quantity", null);

		assertThat(client.delete("/api/shopping-list/" + id).status()).isEqualTo(204);
		assertThat(section(client, "toBuy")).isEmpty();
		assertThat(client.delete("/api/shopping-list/" + id).json()).containsEntry("code", "SHOPPING_ITEM_NOT_FOUND");
	}

	@Test
	void otherHouseholdCannotTouchItems() {
		var olena = Accounts.signUp(client(), "Олена");
		var id = add(olena, Map.of("name", "Сир")).get("id");
		var stranger = Accounts.signUp(client(), "Сусід");

		assertThat(stranger.post("/api/shopping-list/" + id + "/toggle", null).status()).isEqualTo(404);
		assertThat(stranger.patch("/api/shopping-list/" + id, Map.of("name", "Моє")).status()).isEqualTo(404);
		assertThat(stranger.delete("/api/shopping-list/" + id).status()).isEqualTo(404);
		assertThat(section(stranger, "toBuy")).isEmpty();
		assertThat(names(section(olena, "toBuy"))).containsExactly("Сир");
	}

	@Test
	@SuppressWarnings("unchecked")
	void writeOffWithAddToShoppingListCreatesItemOnce() {
		var client = Accounts.signUp(client(), "Олена");
		var body = Products.product("Грецький йогурт", "dairy", 1);
		body.put("quantity", 350);
		body.put("unit", "g");
		var yogurt = Products.create(client, body).get("id");
		var second = Products.create(client, Products.product("грецький ЙОГУРТ", "dairy", 3)).get("id");

		var first = client.post("/api/products/" + yogurt + "/write-off",
				Map.of("outcome", "EATEN", "addToShoppingList", true));
		var again = client.post("/api/products/" + second + "/write-off",
				Map.of("outcome", "WASTED", "addToShoppingList", true));

		assertThat(first.json()).containsEntry("addedToShoppingList", true);
		assertThat(again.json()).containsEntry("addedToShoppingList", true);
		var toBuy = section(client, "toBuy");
		assertThat(toBuy).hasSize(1);
		assertThat(toBuy.getFirst()).containsEntry("name", "Грецький йогурт")
			.containsEntry("quantity", 350)
			.containsEntry("unit", "g")
			.containsEntry("category", "dairy")
			.containsEntry("source", "WRITE_OFF");
		var source = (Map<String, Object>) toBuy.getFirst().get("sourceProduct");
		assertThat(source).containsEntry("id", yogurt).containsEntry("name", "Грецький йогурт");
		assertThat(source.get("closedAt")).isNotNull();

		var withoutFlag = Products.create(client, Products.product("Кефір", "dairy", 2)).get("id");
		assertThat(client.post("/api/products/" + withoutFlag + "/write-off", Map.of("outcome", "EATEN")).json())
			.containsEntry("addedToShoppingList", false);
		assertThat(section(client, "toBuy")).hasSize(1);
	}

	@Test
	void clearBoughtRemovesOnlyBoughtItemsOfOwnHousehold() {
		var client = Accounts.signUp(client(), "Олена");
		var bread = add(client, Map.of("name", "Хліб")).get("id");
		var milk = add(client, Map.of("name", "Молоко")).get("id");
		add(client, Map.of("name", "Яйця"));
		client.post("/api/shopping-list/" + bread + "/toggle", null);
		client.post("/api/shopping-list/" + milk + "/toggle", null);
		var stranger = Accounts.signUp(client(), "Сусід");
		var theirs = add(stranger, Map.of("name", "Сир")).get("id");
		stranger.post("/api/shopping-list/" + theirs + "/toggle", null);

		var cleared = client.delete("/api/shopping-list/bought");

		assertThat(cleared.status()).isEqualTo(200);
		assertThat(cleared.json()).isEqualTo(Map.of("deleted", 2));
		assertThat(section(client, "bought")).isEmpty();
		assertThat(names(section(client, "toBuy"))).containsExactly("Яйця");
		assertThat(names(section(stranger, "bought"))).containsExactly("Сир");
		assertThat(client.delete("/api/shopping-list/bought").json()).isEqualTo(Map.of("deleted", 0));
	}

}
