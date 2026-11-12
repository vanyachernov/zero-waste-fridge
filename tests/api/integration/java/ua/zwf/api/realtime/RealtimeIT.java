package ua.zwf.api.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.notification.ReminderService;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-54: SSE /api/household/stream. */
class RealtimeIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	ReminderService reminders;

	@Test
	void anonymousStreamIs401() {
		try (var stream = client().stream("/api/household/stream")) {
			assertThat(stream.status()).isEqualTo(401);
		}
	}

	@Test
	void familyGetsChangesWithTheActorAndStrangersDoNot() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		var maksym = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, olena, maksym, "MEMBER");
		var stranger = Accounts.signUp(client(), "Сусід");

		try (var olenaStream = olena.stream("/api/household/stream");
				var strangerStream = stranger.stream("/api/household/stream")) {
			assertThat(olenaStream.status()).isEqualTo(200);
			assertThat(olenaStream.next("presence").data()).contains("Олена Кравченко");

			var product = Products.create(maksym, Products.product("Йогурт", "dairy", 2)).get("id");
			var changed = olenaStream.next("changed");
			assertThat(changed.data()).contains("\"topic\":\"products\"").contains("\"name\":\"Максим Кравченко\"");

			maksym.post("/api/products/" + product + "/write-off", Map.of("outcome", "EATEN"));
			assertThat(olenaStream.next("changed").data()).contains("\"topic\":\"products\"");
			assertThat(olenaStream.next("changed").data()).contains("\"topic\":\"shopping-list\"");

			// Невдалий запит нічого не розсилає
			maksym.post("/api/products", Map.of("name", " "));
			Products.create(stranger, Products.product("Чуже", "dairy", 2));
			assertThat(olenaStream.next("changed")).isNull();
			assertThat(strangerStream.next("changed").data()).contains("\"name\":\"Сусід\"");
		}
	}

	@Test
	void presenceShowsWhoIsOnlineAndShopping() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		var maksym = Accounts.signUp(client(), "Максим Кравченко");
		Family.join(jdbc, olena, maksym, "MEMBER");

		try (var olenaStream = olena.stream("/api/household/stream")) {
			olenaStream.next("presence");
			try (var maksymStream = maksym.stream("/api/household/stream")) {
				assertThat(olenaStream.next("presence").data()).contains("Олена Кравченко").contains("Максим Кравченко");

				assertThat(maksym.post("/api/household/presence", Map.of("shoppingAt", "Сільпо")).status()).isEqualTo(204);
				assertThat(olenaStream.next("presence").data()).contains("\"shoppingAt\":\"Сільпо\"");
				assertThat(olena.get("/api/household/presence").body()).contains("\"shoppingAt\":\"Сільпо\"");
				assertThat(maksymStream.next("presence")).isNotNull();
			}
			// Максим закрив вкладку — у списку онлайн лише Олена
			var after = olenaStream.next("presence");
			assertThat(after).isNotNull();
			assertThat(after.data()).doesNotContain("Максим");
		}
	}

	@Test
	void newRemindersRingTheBell() {
		var olena = Accounts.signUp(client(), "Олена");
		try (var stream = olena.stream("/api/household/stream")) {
			stream.next("presence");
			Products.create(olena, Products.product("Йогурт", "dairy", 0));

			reminders.run();

			assertThat(stream.next("notifications")).isNotNull();
		}
	}

}
