package ua.zwf.api.stats;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-200: GET /api/stats/overview із журналу списань. */
class StatsOverviewIT extends IntegrationTest {

	static String add(ApiClient client, String name, String category, int quantity, String unit) {
		var body = new HashMap<>(Products.product(name, category, 2));
		body.put("quantity", quantity);
		body.put("unit", unit);
		return (String) Products.create(client, body).get("id");
	}

	@Test
	@SuppressWarnings("unchecked")
	void overviewOfThisMonth() {
		var client = Accounts.signUp(client(), "Олена");
		var mince = add(client, "Фарш", "meat", 500, "g");
		var milk = add(client, "Молоко", "dairy", 1, "l");
		var bread = add(client, "Хліб", "other", 2, "pcs");
		client.post("/api/products/" + mince + "/write-off", Map.of("outcome", "COOKED"));
		client.post("/api/products/" + milk + "/write-off", Map.of("outcome", "WASTED"));
		client.post("/api/products/" + bread + "/write-off", Map.of("outcome", "EATEN", "quantity", 1));

		var response = client.get("/api/stats/overview?months=3");
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		var json = response.json();

		var months = (List<Map<String, Object>>) json.get("months");
		assertThat(months).hasSize(3);
		assertThat(months.getLast()).containsEntry("month", Products.TODAY.toString().substring(0, 7))
			.containsEntry("saved", 2)
			.containsEntry("wasted", 1);
		var current = (Map<String, Object>) json.get("current");
		assertThat(current).containsEntry("saved", 2).containsEntry("wasted", 1).containsEntry("saveRate", 67)
			.containsEntry("savedKg", 0.8).containsEntry("wastedKg", 1.0);
		assertThat(((Number) current.get("co2SavedKg")).doubleValue()).isEqualTo(10.6);
		assertThat((List<Map<String, Object>>) json.get("byCategory")).extracting(c -> c.get("category"))
			.containsExactlyInAnyOrder("meat", "dairy", "other");
		assertThat((List<Map<String, Object>>) json.get("topWasted")).singleElement()
			.satisfies(w -> assertThat(w).containsEntry("name", "Молоко").containsEntry("times", 1).containsEntry("unit", "l"));
		assertThat((List<Map<String, Object>>) json.get("members")).singleElement()
			.satisfies(m -> assertThat(m).containsEntry("name", "Олена").containsEntry("saved", 2));
	}

	@Test
	void validatesMonthsAndRequiresSession() {
		var client = Accounts.signUp(client(), "Олена");
		assertThat(client.get("/api/stats/overview?months=13").json()).containsEntry("errors", Map.of("months", "Range"));
		assertThat(client.get("/api/stats/overview").status()).isEqualTo(200);
		assertThat(client().get("/api/stats/overview").status()).isEqualTo(401);
	}

}
