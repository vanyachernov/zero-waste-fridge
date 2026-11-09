package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;

/** B-14: GET /api/products/summary. */
class ProductSummaryIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void emptyFridgeIsAllZeros() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(client.get("/api/products/summary").json()).isEqualTo(
				Map.of("total", 0, "addedThisWeek", 0, "soon", 0, "today", 0, "expired", 0));
		assertThat(client().get("/api/products/summary").status()).isEqualTo(401);
	}

	@Test
	void countsActiveProductsOfOwnHouseholdOnly() {
		var client = Accounts.signUp(client(), "Олена");
		ProductsIT.create(client, ProductsIT.product("Фарш", "meat", -1));
		ProductsIT.create(client, ProductsIT.product("Шпинат", "vegetables", 0));
		ProductsIT.create(client, ProductsIT.product("Йогурт", "dairy", 2));
		ProductsIT.create(client, ProductsIT.product("Сир", "dairy", 3));
		var old = ProductsIT.create(client, ProductsIT.product("Соус", "sauces", 30)).get("id");
		var eaten = ProductsIT.create(client, ProductsIT.product("Молоко", "dairy", 1)).get("id");
		client.post("/api/products/" + eaten + "/write-off", Map.of("outcome", "EATEN"));
		jdbc.update("update product set created_at = now() - interval '8 days' where id = ?::uuid", old);

		var stranger = Accounts.signUp(client(), "Сусід");
		ProductsIT.create(stranger, ProductsIT.product("Чужий фарш", "meat", -1));

		assertThat(client.get("/api/products/summary").json()).isEqualTo(
				Map.of("total", 5, "addedThisWeek", 4, "soon", 2, "today", 1, "expired", 1));
	}

}
