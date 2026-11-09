package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-43: Smart Sync — продукт закінчився → позиція AUTO; налаштування домогосподарства. */
class SmartSyncIT extends IntegrationTest {

	static Object product(ApiClient client, String name, String category) {
		var body = Products.product(name, category, 3);
		body.put("quantity", 2);
		return Products.create(client, body).get("id");
	}

	@Test
	void defaultsAreOnWithoutExclusions() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(client.get("/api/shopping-list/settings").json()).isEqualTo(
				Map.of("autoRefill", true, "excludedCategories", List.of()));
		assertThat(client().get("/api/shopping-list/settings").status()).isEqualTo(401);
	}

	@Test
	void finishedProductIsAddedAutomaticallyPartialIsNot() {
		var client = Accounts.signUp(client(), "Олена");
		var milk = product(client, "Молоко", "dairy");

		var partial = client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN", "quantity", 1));
		assertThat(partial.json()).containsEntry("addedToShoppingList", false);
		assertThat(ShoppingListIT.section(client, "toBuy")).isEmpty();

		var rest = client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN"));
		assertThat(rest.json()).containsEntry("addedToShoppingList", true);
		var toBuy = ShoppingListIT.section(client, "toBuy");
		assertThat(toBuy).hasSize(1);
		assertThat(toBuy.getFirst()).containsEntry("name", "Молоко").containsEntry("source", "AUTO");
		assertThat(ShoppingListIT.names(StoreIT.items(client, "?fromFridge=true"))).containsExactly("Молоко");
	}

	@Test
	void excludedCategoriesAndSwitchOff() {
		var client = Accounts.signUp(client(), "Олена");

		var saved = client.send("PUT", "/api/shopping-list/settings",
				Map.of("autoRefill", true, "excludedCategories", List.of("sauces", "dairy", "sauces")));
		assertThat(saved.status()).as(saved.body()).isEqualTo(200);
		assertThat(saved.json()).isEqualTo(Map.of("autoRefill", true, "excludedCategories", List.of("dairy", "sauces")));
		assertThat(client.get("/api/shopping-list/settings").json()).isEqualTo(saved.json());

		var ketchup = product(client, "Кетчуп", "sauces");
		var apples = product(client, "Яблука", "fruits");
		client.post("/api/products/" + ketchup + "/write-off", Map.of("outcome", "EATEN"));
		client.post("/api/products/" + apples + "/write-off", Map.of("outcome", "WASTED"));
		assertThat(ShoppingListIT.names(ShoppingListIT.section(client, "toBuy"))).containsExactly("Яблука");

		client.send("PUT", "/api/shopping-list/settings", Map.of("autoRefill", false));
		var pears = product(client, "Груші", "fruits");
		assertThat(client.post("/api/products/" + pears + "/write-off", Map.of("outcome", "EATEN")).json())
			.containsEntry("addedToShoppingList", false);
		assertThat(ShoppingListIT.names(ShoppingListIT.section(client, "toBuy"))).containsExactly("Яблука");
	}

	@Test
	void settingsValidationAndIsolation() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(ShoppingListIT.errors(client.send("PUT", "/api/shopping-list/settings", Map.of())))
			.isEqualTo(Map.of("autoRefill", "NotNull"));
		assertThat(ShoppingListIT.errors(client.send("PUT", "/api/shopping-list/settings",
				Map.of("autoRefill", true, "excludedCategories", List.of("fish")))))
			.isEqualTo(Map.of("excludedCategories[0]", "INVALID"));

		client.send("PUT", "/api/shopping-list/settings", Map.of("autoRefill", false));
		var stranger = Accounts.signUp(client(), "Сусід");
		assertThat(stranger.get("/api/shopping-list/settings").json()).containsEntry("autoRefill", true);
	}

}
