package ua.zwf.api.tip;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Products;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;

/** B-15: GET /api/tips/today. */
class TipIT extends IntegrationTest {

	@Test
	void requiresSession() {
		assertThat(client().get("/api/tips/today").status()).isEqualTo(401);
	}

	@Test
	void emptyFridge() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(client.get("/api/tips/today").json()).containsEntry("kind", "EMPTY")
			.containsEntry("products", List.of())
			.containsEntry("hint", null)
			.containsEntry("date", Products.TODAY.toString());
	}

	@Test
	@SuppressWarnings("unchecked")
	void suggestsUsingProductsExpiringWithin24Hours() {
		var client = Accounts.signUp(client(), "Олена");
		var spinach = Products.create(client, Products.product("Шпинат Baby", "vegetables", 0)).get("id");
		Products.create(client, Products.product("Фарш", "meat", -1));
		Products.create(client, Products.product("Сир", "dairy", 9));
		var eaten = Products.create(client, Products.product("Салат", "vegetables", 1)).get("id");
		client.post("/api/products/" + eaten + "/write-off", Map.of("outcome", "EATEN"));

		var tip = client.get("/api/tips/today").json();

		assertThat(tip).containsEntry("kind", "USE_SOON").containsEntry("hint", "SALAD");
		assertThat((List<Map<String, Object>>) tip.get("products")).containsExactly(
				Map.of("id", spinach, "name", "Шпинат Baby", "category", "vegetables", "daysLeft", 0));
	}

}
