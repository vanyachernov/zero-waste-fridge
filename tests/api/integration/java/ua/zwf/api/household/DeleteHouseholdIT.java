package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;
import ua.zwf.api.support.TestData;

/** B-55: DELETE /api/household. */
class DeleteHouseholdIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void ownerDeletesEverythingWithPasswordAndMembersGetOwnHouseholds() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		var maksym = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, olena, maksym, "MEMBER");
		var doomed = Family.householdId(olena);
		var milk = Products.create(maksym, Products.product("Молоко", "dairy", 1)).get("id");
		maksym.post("/api/products/" + milk + "/write-off", Map.of("outcome", "EATEN", "quantity", 0.5));
		olena.post("/api/shopping-list", Map.of("name", "Хліб"));
		olena.post("/api/shopping-list/stores", Map.of("name", "Сільпо"));
		olena.post("/api/household/invites/code", null);

		var deleted = olena.send("DELETE", "/api/household", Map.of("password", TestData.PASSWORD));

		assertThat(deleted.status()).as(deleted.body()).isEqualTo(200);
		assertThat(deleted.json()).containsEntry("role", "OWNER").containsEntry("householdName", "Сім'я Кравченко");
		assertThat(deleted.json().get("householdId")).isNotEqualTo(doomed.toString());
		for (String table : new String[] { "product", "product_event", "shopping_item", "store", "household_join_code" }) {
			assertThat(jdbc.queryForObject("select count(*) from " + table + " where household_id = ?", Long.class,
					doomed)).as(table).isZero();
		}
		assertThat(jdbc.queryForObject("select count(*) from household where id = ?", Long.class, doomed)).isZero();

		assertThat(olena.get("/api/products").json()).containsEntry("total", 0);
		var maksymNow = maksym.get("/api/household").json();
		assertThat(maksymNow).containsEntry("role", "OWNER").containsEntry("memberCount", 1);
		assertThat(maksymNow.get("id")).isNotEqualTo(Family.householdId(olena).toString());
	}

	@Test
	void requiresOwnerAndCorrectPassword() {
		var olena = Accounts.signUp(client(), "Олена");
		var maksym = Accounts.signUp(client(), "Максим");
		Family.join(jdbc, olena, maksym, "MEMBER");

		assertThat(maksym.send("DELETE", "/api/household", Map.of("password", TestData.PASSWORD)).status())
			.isEqualTo(403);
		assertThat(olena.send("DELETE", "/api/household", Map.of("password", "wrong-password")).json())
			.containsEntry("errors", Map.of("password", "INVALID_PASSWORD"));
		assertThat(olena.send("DELETE", "/api/household", Map.of()).json()).containsEntry("errors",
				Map.of("password", "NotBlank"));
		assertThat(olena.get("/api/household").json()).containsEntry("memberCount", 2);
	}

}
