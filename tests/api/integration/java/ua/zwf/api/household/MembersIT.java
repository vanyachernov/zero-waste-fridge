package ua.zwf.api.household;

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

/** B-51: /api/household/members. */
class MembersIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> members(ApiClient client) {
		var response = client.get("/api/household/members");
		assertThat(response.status()).as(response.body()).isEqualTo(200);
		return tools.jackson.databind.json.JsonMapper.builder().build().readValue(response.body(), List.class);
	}

	record Trio(ApiClient owner, ApiClient member, ApiClient other) {
	}

	Trio family() {
		var owner = Accounts.signUp(client(), "Олена Кравченко");
		var member = Accounts.signUp(client(), "Максим Кравченко");
		var other = Accounts.signUp(client(), "Ірина Кравченко");
		Family.join(jdbc, owner, member, "MEMBER");
		Family.join(jdbc, owner, other, "MEMBER");
		return new Trio(owner, member, other);
	}

	@Test
	@SuppressWarnings("unchecked")
	void listsOwnersFirstWithLastActivity() {
		var f = family();
		Products.create(f.member(), Products.product("Молоко", "dairy", 3));

		var list = members(f.other());

		assertThat(list).extracting(m -> m.get("name")).containsExactly("Олена Кравченко", "Максим Кравченко",
				"Ірина Кравченко");
		assertThat(list).extracting(m -> m.get("role")).containsExactly("OWNER", "MEMBER", "MEMBER");
		assertThat(list).extracting(m -> m.get("me")).containsExactly(false, false, true);
		var last = (Map<String, Object>) list.get(1).get("lastActivity");
		assertThat(last).containsEntry("type", "PRODUCT_ADDED");
		assertThat((Map<String, Object>) last.get("subject")).containsEntry("name", "Молоко");
		assertThat(list.get(0).get("lastActivity")).isNull();
		assertThat(list.get(0).get("email").toString()).endsWith("@example.test");
	}

	@Test
	void ownerChangesRolesButNotTheLastOwner() {
		var f = family();
		var memberId = Family.userId(f.member());
		var ownerId = Family.userId(f.owner());

		var forbidden = f.member().patch("/api/household/members/" + ownerId, Map.of("role", "MEMBER"));
		assertThat(forbidden.status()).isEqualTo(403);

		var lastOwner = f.owner().patch("/api/household/members/" + ownerId, Map.of("role", "MEMBER"));
		assertThat(lastOwner.status()).isEqualTo(409);
		assertThat(lastOwner.json()).containsEntry("code", "LAST_OWNER");

		var promoted = f.owner().patch("/api/household/members/" + memberId, Map.of("role", "OWNER"));
		assertThat(promoted.status()).as(promoted.body()).isEqualTo(200);
		assertThat(promoted.json()).containsEntry("role", "OWNER");
		// Тепер власників двоє — Олена може стати членом сім'ї
		assertThat(f.owner().patch("/api/household/members/" + ownerId, Map.of("role", "MEMBER")).json())
			.containsEntry("role", "MEMBER");
		assertThat(f.owner().get("/api/household").json()).containsEntry("role", "MEMBER");

		assertThat(f.member().patch("/api/household/members/" + memberId, Map.of()).json()).containsEntry("errors",
				Map.of("role", "NotNull"));
	}

	@Test
	void ownerRemovesMemberWhoGetsOwnEmptyHousehold() {
		var f = family();
		Products.create(f.member(), Products.product("Сир", "dairy", 5));
		var memberId = Family.userId(f.member());

		assertThat(f.owner().delete("/api/household/members/" + memberId).status()).isEqualTo(204);

		assertThat(members(f.owner())).hasSize(2);
		var removed = f.member().get("/api/household").json();
		assertThat(removed).containsEntry("role", "OWNER").containsEntry("memberCount", 1)
			.containsEntry("name", "Сім'я Кравченко");
		// Продукт лишився в спільному холодильнику
		assertThat(f.member().get("/api/products").json()).containsEntry("total", 0);
		assertThat(f.owner().get("/api/products").json()).containsEntry("total", 1);
	}

	@Test
	void memberCanLeaveButCannotRemoveOthers() {
		var f = family();
		var otherId = Family.userId(f.other());
		var memberId = Family.userId(f.member());

		var forbidden = f.member().delete("/api/household/members/" + otherId);
		assertThat(forbidden.status()).isEqualTo(403);
		assertThat(forbidden.json()).containsEntry("code", "FORBIDDEN");

		assertThat(f.member().delete("/api/household/members/" + memberId).status()).isEqualTo(204);
		assertThat(members(f.owner())).extracting(m -> m.get("name")).containsExactly("Олена Кравченко",
				"Ірина Кравченко");
	}

	@Test
	void lastOwnerCannotLeaveAndStrangersAreNotFound() {
		var f = family();
		var ownerId = Family.userId(f.owner());

		assertThat(f.owner().delete("/api/household/members/" + ownerId).json()).containsEntry("code", "LAST_OWNER");

		var stranger = Accounts.signUp(client(), "Сусід");
		var strangerId = Family.userId(stranger);
		var notFound = f.owner().delete("/api/household/members/" + strangerId);
		assertThat(notFound.status()).isEqualTo(404);
		assertThat(notFound.json()).containsEntry("code", "MEMBER_NOT_FOUND");
		assertThat(f.owner().patch("/api/household/members/" + strangerId, Map.of("role", "OWNER")).status())
			.isEqualTo(404);
	}

}
