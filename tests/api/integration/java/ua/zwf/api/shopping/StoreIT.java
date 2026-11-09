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

/** B-44: магазини домогосподарства та фільтри списку покупок. */
class StoreIT extends IntegrationTest {

	static Object store(ApiClient client, String name) {
		var response = client.post("/api/shopping-list/stores", Map.of("name", name));
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json().get("id");
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> stores(ApiClient client) {
		var response = client.get("/api/shopping-list/stores");
		assertThat(response.status()).isEqualTo(200);
		return parseList(response.body());
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> parseList(String body) {
		return tools.jackson.databind.json.JsonMapper.builder().build().readValue(body, List.class);
	}

	@Test
	void createListAndRejectDuplicatesIgnoringCase() {
		var client = Accounts.signUp(client(), "Олена");
		store(client, "  Сільпо ");
		store(client, "АТБ");

		assertThat(stores(client)).extracting(s -> s.get("name")).containsExactly("АТБ", "Сільпо");

		var duplicate = client.post("/api/shopping-list/stores", Map.of("name", "сільпо"));
		assertThat(duplicate.status()).isEqualTo(409);
		assertThat(duplicate.json()).containsEntry("code", "STORE_EXISTS");
		assertThat(ShoppingListIT.errors(client.post("/api/shopping-list/stores", Map.of("name", " "))))
			.isEqualTo(Map.of("name", "NotBlank"));

		// Інше домогосподарство може мати свій «Сільпо» і не бачить чужих
		var stranger = Accounts.signUp(client(), "Сусід");
		store(stranger, "Сільпо");
		assertThat(stores(stranger)).hasSize(1);
	}

	@Test
	@SuppressWarnings("unchecked")
	void itemsGetStoreAndListFiltersByStoreOrFridge() {
		var client = Accounts.signUp(client(), "Олена");
		var silpo = store(client, "Сільпо");
		ShoppingListIT.add(client, Map.of("name", "Хліб", "storeId", silpo));
		var milk = ShoppingListIT.add(client, Map.of("name", "Молоко")).get("id");
		var product = Products.create(client, Products.product("Кефір", "dairy", 1)).get("id");
		client.post("/api/products/" + product + "/write-off", Map.of("outcome", "EATEN", "addToShoppingList", true));

		var bread = ShoppingListIT.section(client, "toBuy").getFirst();
		assertThat((Map<String, Object>) bread.get("store")).isEqualTo(Map.of("id", silpo, "name", "Сільпо"));

		assertThat(ShoppingListIT.names(items(client, "?store=" + silpo))).containsExactly("Хліб");
		assertThat(ShoppingListIT.names(items(client, "?fromFridge=true"))).containsExactly("Кефір");
		assertThat(ShoppingListIT.names(items(client, ""))).containsExactly("Хліб", "Молоко", "Кефір");

		assertThat(client.patch("/api/shopping-list/" + milk, Map.of("storeId", silpo)).json().get("store")).isNotNull();
		var clear = new HashMap<String, Object>();
		clear.put("storeId", null);
		assertThat(client.patch("/api/shopping-list/" + milk, clear).json()).containsEntry("store", null);
	}

	@Test
	void foreignOrUnknownStoreIsAFieldError() {
		var client = Accounts.signUp(client(), "Олена");
		var stranger = Accounts.signUp(client(), "Сусід");
		var theirs = store(stranger, "Їхній");

		assertThat(ShoppingListIT.errors(client.post("/api/shopping-list", Map.of("name", "Хліб", "storeId", theirs))))
			.isEqualTo(Map.of("storeId", "INVALID"));
		assertThat(client.delete("/api/shopping-list/stores/" + theirs).status()).isEqualTo(404);
	}

	@Test
	void deletingStoreKeepsItsItems() {
		var client = Accounts.signUp(client(), "Олена");
		var atb = store(client, "АТБ");
		ShoppingListIT.add(client, Map.of("name", "Сир", "storeId", atb));

		assertThat(client.delete("/api/shopping-list/stores/" + atb).status()).isEqualTo(204);

		assertThat(stores(client)).isEmpty();
		assertThat(ShoppingListIT.section(client, "toBuy").getFirst()).containsEntry("name", "Сир")
			.containsEntry("store", null);
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> items(ApiClient client, String query) {
		var response = client.get("/api/shopping-list" + query);
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return (List<Map<String, Object>>) response.json().get("toBuy");
	}

}
