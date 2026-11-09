package ua.zwf.api.activity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-53: GET /api/household/activity. */
class ActivityIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> items(ApiClient.Response response) {
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return (List<Map<String, Object>>) response.json().get("items");
	}

	@SuppressWarnings("unchecked")
	static String actor(Map<String, Object> entry) {
		var actor = (Map<String, Object>) entry.get("actor");
		return actor == null ? null : (String) actor.get("name");
	}

	@SuppressWarnings("unchecked")
	static String subject(Map<String, Object> entry) {
		return (String) ((Map<String, Object>) entry.get("subject")).get("name");
	}

	@Test
	void familyFeedNewestFirstWithWhoDidWhat() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		var maksym = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, olena, maksym, "MEMBER");
		olena.send("PUT", "/api/shopping-list/settings", Map.of("autoRefill", false));

		var milk = Products.create(olena, Products.product("Молоко", "dairy", 3)).get("id");
		var bread = olena.post("/api/shopping-list", Map.of("name", "Хліб")).json().get("id");
		maksym.post("/api/shopping-list/" + bread + "/toggle", null);
		maksym.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN"));

		var feed = items(olena.get("/api/household/activity"));

		assertThat(feed).extracting(e -> e.get("type")).containsExactly("PRODUCT_WRITTEN_OFF", "SHOPPING_BOUGHT",
				"SHOPPING_ADDED", "PRODUCT_ADDED");
		assertThat(feed).extracting(ActivityIT::actor).containsExactly("Максим Кравченко", "Максим Кравченко",
				"Олена Кравченко", "Олена Кравченко");
		assertThat(feed).extracting(ActivityIT::subject).containsExactly("Молоко", "Хліб", "Хліб", "Молоко");
		assertThat(feed.getFirst()).containsEntry("outcome", "EATEN").containsEntry("quantity", 1)
			.containsEntry("unit", "pcs");
		assertThat(feed.get(1)).containsEntry("outcome", null).containsEntry("quantity", null);

		// Член сім'ї бачить ту саму стрічку, сусід — порожню
		assertThat(items(maksym.get("/api/household/activity"))).hasSize(4);
		assertThat(items(Accounts.signUp(client(), "Сусід").get("/api/household/activity"))).isEmpty();
	}

	@Test
	void paginatesWithBefore() {
		var client = Accounts.signUp(client(), "Олена");
		for (String name : List.of("A", "B", "C", "D", "E")) {
			Products.create(client, Products.product(name, "other", 5));
		}

		var first = client.get("/api/household/activity?limit=2");
		assertThat(items(first)).extracting(ActivityIT::subject).containsExactly("E", "D");
		var before = (String) first.json().get("nextBefore");
		assertThat(before).isNotNull();

		var second = client.get("/api/household/activity?limit=2&before=" + before);
		assertThat(items(second)).extracting(ActivityIT::subject).containsExactly("C", "B");

		var last = client.get("/api/household/activity?limit=2&before=" + second.json().get("nextBefore"));
		assertThat(items(last)).extracting(ActivityIT::subject).containsExactly("A");
		assertThat(last.json()).containsEntry("nextBefore", null);

		assertThat(client.get("/api/household/activity?limit=0").json()).containsEntry("errors",
				Map.of("limit", "Range"));
	}

	@Test
	void autoRefillIsNotShownAsSomeonesAction() {
		var client = Accounts.signUp(client(), "Олена");
		var milk = Products.create(client, Products.product("Молоко", "dairy", 3)).get("id");
		client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN"));

		assertThat(items(client.get("/api/household/activity"))).extracting(e -> e.get("type"))
			.containsExactly("PRODUCT_WRITTEN_OFF", "PRODUCT_ADDED");
	}

}
