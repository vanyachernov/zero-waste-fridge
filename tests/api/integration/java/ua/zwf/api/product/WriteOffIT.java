package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;

/** B-13: POST /api/products/{id}/write-off і журнал подій. */
class WriteOffIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	static Object yogurt(ApiClient client) {
		var body = ProductsIT.product("Грецький йогурт", "dairy", 2);
		body.put("quantity", 350);
		body.put("unit", "g");
		return ProductsIT.create(client, body).get("id");
	}

	static Map<String, Object> writeOff(String outcome, Object quantity) {
		var body = new HashMap<String, Object>();
		body.put("outcome", outcome);
		if (quantity != null) {
			body.put("quantity", quantity);
		}
		return body;
	}

	@SuppressWarnings("unchecked")
	static Map<String, Object> map(Map<String, Object> json, String key) {
		return (Map<String, Object>) json.get(key);
	}

	@Test
	void partialThenFullWriteOff() {
		var client = Accounts.signUp(client(), "Олена");
		var id = yogurt(client);

		var partial = client.post("/api/products/" + id + "/write-off", writeOff("EATEN", 100));

		assertThat(partial.status()).as(partial.body()).isEqualTo(200);
		assertThat(map(partial.json(), "product")).containsEntry("quantity", 250).containsEntry("status", "ACTIVE");
		assertThat(map(partial.json(), "writtenOff")).isEqualTo(
				Map.of("outcome", "EATEN", "quantity", 100, "unit", "g", "closed", false));
		assertThat(partial.json()).containsEntry("addedToShoppingList", false);

		var rest = client.post("/api/products/" + id + "/write-off", Map.of("outcome", "COOKED", "quantity", "all",
				"addToShoppingList", true));

		assertThat(map(rest.json(), "product")).containsEntry("status", "CONSUMED").containsEntry("quantity", 250);
		assertThat(map(rest.json(), "writtenOff")).containsEntry("quantity", 250).containsEntry("closed", true);
		assertThat(rest.json()).containsEntry("addedToShoppingList", false);

		// Зникає з холодильника, але лишається в історії
		assertThat(ProductsIT.items(client.get("/api/products"))).isEmpty();
		assertThat(ProductsIT.names(client.get("/api/products?status=consumed"))).containsExactly("Грецький йогурт");
	}

	@Test
	void wastedProductGetsWastedStatus() {
		var client = Accounts.signUp(client(), "Олена");
		var id = yogurt(client);

		var response = client.post("/api/products/" + id + "/write-off", writeOff("WASTED", null));

		assertThat(map(response.json(), "product")).containsEntry("status", "WASTED");
		assertThat(ProductsIT.names(client.get("/api/products?status=WASTED"))).containsExactly("Грецький йогурт");
	}

	@Test
	void closedProductCannotBeChangedAgain() {
		var client = Accounts.signUp(client(), "Олена");
		var id = yogurt(client);
		client.post("/api/products/" + id + "/write-off", writeOff("EATEN", null));

		var again = client.post("/api/products/" + id + "/write-off", writeOff("EATEN", null));
		assertThat(again.status()).isEqualTo(409);
		assertThat(again.json()).containsEntry("code", "PRODUCT_CLOSED");
		assertThat(client.patch("/api/products/" + id, Map.of("name", "Інше")).json()).containsEntry("code",
				"PRODUCT_CLOSED");
	}

	@Test
	void invalidRequests() {
		var client = Accounts.signUp(client(), "Олена");
		var id = yogurt(client);

		assertThat(ProductsIT.errors(client.post("/api/products/" + id + "/write-off", writeOff("EATEN", 351))))
			.isEqualTo(Map.of("quantity", "EXCEEDS_REMAINING"));
		assertThat(ProductsIT.errors(client.post("/api/products/" + id + "/write-off", Map.of("quantity", "half"))))
			.isEqualTo(Map.of("outcome", "NotNull", "quantity", "INVALID"));
		assertThat(ProductsIT.errors(client.post("/api/products/" + id + "/write-off", writeOff("LOST", null))))
			.isEqualTo(Map.of("outcome", "INVALID"));

		var stranger = Accounts.signUp(client(), "Сусід");
		assertThat(stranger.post("/api/products/" + id + "/write-off", writeOff("EATEN", null)).status()).isEqualTo(404);
		assertThat(client.post("/api/products/" + id + "/write-off", writeOff("EATEN", null)).status()).isEqualTo(200);
	}

	@Test
	void historyRecordsWhoDidWhat() {
		var client = Accounts.signUp(client(), "Олена");
		var id = yogurt(client);
		client.patch("/api/products/" + id, Map.of("zone", "middle"));
		client.patch("/api/products/" + id, Map.of("openedAt", ProductsIT.TODAY.toString()));
		client.post("/api/products/" + id + "/write-off", writeOff("WASTED", 50));

		List<Map<String, Object>> events = jdbc.queryForList("""
				select e.type, e.outcome, e.quantity, e.unit, u.name as actor
				from product_event e left join app_user u on u.id = e.actor_id
				where e.product_id = ?::uuid order by e.occurred_at""", id);

		assertThat(events).extracting(e -> e.get("type")).containsExactly("ADDED", "UPDATED", "OPENED", "WRITTEN_OFF");
		assertThat(events).allSatisfy(e -> assertThat(e.get("actor")).isEqualTo("Олена"));
		assertThat(events.get(3)).containsEntry("outcome", "WASTED").containsEntry("unit", "g");
		assertThat((java.math.BigDecimal) events.get(3).get("quantity")).isEqualByComparingTo("50");
	}

}
