package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-50: GET / PATCH /api/household і перевірка ролей. */
class HouseholdIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void ownerSeesAllPermissions() {
		var owner = Accounts.signUp(client(), "Олена Кравченко");

		var json = owner.get("/api/household").json();

		assertThat(json).containsEntry("name", "Сім'я Кравченко")
			.containsEntry("memberCount", 1)
			.containsEntry("role", "OWNER");
		assertThat((List<?>) json.get("permissions")).hasSize(HouseholdPermission.values().length);
		assertThat(client().get("/api/household").status()).isEqualTo(401);
	}

	@Test
	void memberIsForbiddenToManageButWorksWithTheFridge() {
		var owner = Accounts.signUp(client(), "Олена Кравченко");
		var member = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, owner, member, "MEMBER");

		var json = member.get("/api/household").json();
		assertThat(json).containsEntry("role", "MEMBER").containsEntry("memberCount", 2)
			.containsEntry("name", "Сім'я Кравченко");
		assertThat(json.get("permissions").toString()).doesNotContain("MANAGE_MEMBERS", "DELETE_HOUSEHOLD")
			.contains("SHOPPING_LIST");

		var rename = member.patch("/api/household", Map.of("name", "Наша"));
		assertThat(rename.status()).isEqualTo(403);
		assertThat(rename.json()).containsEntry("code", "FORBIDDEN");

		// Спільний холодильник: продукт члена сім'ї бачить власник
		Products.create(member, Products.product("Молоко", "dairy", 3));
		assertThat(owner.get("/api/products").json()).containsEntry("total", 1);
	}

	@Test
	void ownerRenamesHousehold() {
		var owner = Accounts.signUp(client(), "Олена Кравченко");

		var renamed = owner.patch("/api/household", Map.of("name", "  Кравченки   й кіт "));

		assertThat(renamed.status()).as(renamed.body()).isEqualTo(200);
		assertThat(renamed.json()).containsEntry("name", "Кравченки й кіт");
		assertThat(owner.get("/api/auth/me").json()).containsEntry("householdName", "Кравченки й кіт");
		assertThat(owner.patch("/api/household", Map.of("name", " ")).json()).containsEntry("errors",
				Map.of("name", "NotBlank"));
	}

	@Test
	void roleChangeTakesEffectWithoutNewLogin() {
		var owner = Accounts.signUp(client(), "Олена Кравченко");
		var member = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, owner, member, "MEMBER");
		assertThat(member.patch("/api/household", Map.of("name", "Ми")).status()).isEqualTo(403);

		jdbc.update("update household_member set role = 'OWNER' where user_id = ?", Family.userId(member));

		assertThat(member.patch("/api/household", Map.of("name", "Ми")).status()).isEqualTo(200);
	}

}
