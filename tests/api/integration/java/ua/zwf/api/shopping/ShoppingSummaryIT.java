package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-45: GET /api/shopping-list/summary. */
class ShoppingSummaryIT extends IntegrationTest {

	@Test
	void emptyList() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(client.get("/api/shopping-list/summary").json()).isEqualTo(
				Map.of("bought", 0, "total", 0, "estimatedTotal", 0, "autoCount", 0));
		assertThat(client().get("/api/shopping-list/summary").status()).isEqualTo(401);
	}

	@Test
	void countsProgressEstimateAndAutoItems() {
		var client = Accounts.signUp(client(), "Олена");
		var bread = ShoppingListIT.add(client, Map.of("name", "Хліб", "priceEstimate", 32.5)).get("id");
		ShoppingListIT.add(client, Map.of("name", "Сир", "priceEstimate", 120));
		ShoppingListIT.add(client, Map.of("name", "Сіль"));
		client.post("/api/shopping-list/" + bread + "/toggle", null);
		var milk = Products.create(client, Products.product("Молоко", "dairy", 2)).get("id");
		client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN"));
		var stranger = Accounts.signUp(client(), "Сусід");
		ShoppingListIT.add(stranger, Map.of("name", "Чуже", "priceEstimate", 999));

		assertThat(client.get("/api/shopping-list/summary").json()).isEqualTo(
				Map.of("bought", 1, "total", 4, "estimatedTotal", 152.5, "autoCount", 1));
	}

}
