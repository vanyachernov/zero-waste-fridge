package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-42: POST /api/shopping-list/move-to-fridge. */
class MoveToFridgeIT extends IntegrationTest {

	static Object bought(ApiClient client, Map<String, Object> body) {
		var id = ShoppingListIT.add(client, body).get("id");
		client.post("/api/shopping-list/" + id + "/toggle", null);
		return id;
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> products(ApiClient.Response response) {
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return (List<Map<String, Object>>) response.json().get("products");
	}

	@Test
	void movesAllBoughtWithDefaultsWhenNoItemsGiven() {
		var client = Accounts.signUp(client(), "Олена");
		bought(client, Map.of("name", "Філе куряче", "quantity", 650, "unit", "g", "category", "meat"));
		bought(client, Map.of("name", "Хліб"));
		ShoppingListIT.add(client, Map.of("name", "Яйця"));

		var response = client.post("/api/shopping-list/move-to-fridge", Map.of());

		assertThat(response.json()).containsEntry("moved", 2);
		var created = products(response);
		assertThat(created).extracting(p -> p.get("name")).containsExactlyInAnyOrder("Філе куряче", "Хліб");
		var chicken = created.stream().filter(p -> p.get("name").equals("Філе куряче")).findFirst().orElseThrow();
		assertThat(chicken).containsEntry("category", "meat")
			.containsEntry("zone", "fresh")
			.containsEntry("quantity", 650)
			.containsEntry("unit", "g")
			.containsEntry("purchasedAt", Products.TODAY.toString())
			.containsEntry("expiresAt", Products.TODAY.plusDays(3).toString());
		var bread = created.stream().filter(p -> p.get("name").equals("Хліб")).findFirst().orElseThrow();
		assertThat(bread).containsEntry("category", "other")
			.containsEntry("quantity", 1)
			.containsEntry("unit", "pcs")
			.containsEntry("expiresAt", Products.TODAY.plusDays(14).toString());

		assertThat(ShoppingListIT.section(client, "bought")).isEmpty();
		assertThat(ShoppingListIT.names(ShoppingListIT.section(client, "toBuy"))).containsExactly("Яйця");
		var fridge = client.get("/api/products?sort=name");
		assertThat(fridge.json()).containsEntry("total", 2);
	}

	@Test
	void selectedItemsWithCorrections() {
		var client = Accounts.signUp(client(), "Олена");
		var yogurt = bought(client, Map.of("name", "Йогурт", "quantity", 2, "unit", "pcs", "category", "dairy"));
		bought(client, Map.of("name", "Сир"));

		var response = client.post("/api/shopping-list/move-to-fridge", Map.of("items", List.of(Map.of("id", yogurt,
				"expiresAt", Products.TODAY.plusDays(10).toString(), "zone", "door"))));

		var created = products(response);
		assertThat(created).hasSize(1);
		assertThat(created.getFirst()).containsEntry("name", "Йогурт")
			.containsEntry("zone", "door")
			.containsEntry("expiresAt", Products.TODAY.plusDays(10).toString());
		assertThat(ShoppingListIT.names(ShoppingListIT.section(client, "bought"))).containsExactly("Сир");
	}

	@Test
	void nothingMovesWhenOneItemIsInvalid() {
		var client = Accounts.signUp(client(), "Олена");
		var milk = bought(client, Map.of("name", "Молоко"));
		var eggs = ShoppingListIT.add(client, Map.of("name", "Яйця")).get("id");

		var notBought = client.post("/api/shopping-list/move-to-fridge",
				Map.of("items", List.of(Map.of("id", milk), Map.of("id", eggs))));
		assertThat(notBought.status()).isEqualTo(409);
		assertThat(notBought.json()).containsEntry("code", "ITEM_NOT_BOUGHT");

		var pastDate = client.post("/api/shopping-list/move-to-fridge", Map.of("items", List.of(Map.of("id", milk,
				"expiresAt", Products.TODAY.minusDays(1).toString()))));
		assertThat(ShoppingListIT.errors(pastDate)).isEqualTo(Map.of("items[0].expiresAt", "BEFORE_PURCHASE"));

		assertThat(ShoppingListIT.errors(client.post("/api/shopping-list/move-to-fridge",
				Map.of("items", List.of(Map.of("id", milk), Map.of("id", milk))))))
			.isEqualTo(Map.of("items[1].id", "DUPLICATE"));
		assertThat(ShoppingListIT.errors(client.post("/api/shopping-list/move-to-fridge", Map.of("items", List.of()))))
			.isEqualTo(Map.of("items", "NotEmpty"));

		// Транзакція відкотилась: молоко досі в «Вже куплено», холодильник порожній
		assertThat(ShoppingListIT.names(ShoppingListIT.section(client, "bought"))).containsExactly("Молоко");
		assertThat(client.get("/api/products").json()).containsEntry("total", 0);
	}

	@Test
	void foreignItemIs404AndEmptyListMovesNothing() {
		var olena = Accounts.signUp(client(), "Олена");
		var milk = bought(olena, Map.of("name", "Молоко"));
		var stranger = Accounts.signUp(client(), "Сусід");

		assertThat(stranger.post("/api/shopping-list/move-to-fridge", Map.of("items", List.of(Map.of("id", milk))))
			.status()).isEqualTo(404);
		assertThat(stranger.post("/api/shopping-list/move-to-fridge", Map.of()).json()).containsEntry("moved", 0);
	}

}
