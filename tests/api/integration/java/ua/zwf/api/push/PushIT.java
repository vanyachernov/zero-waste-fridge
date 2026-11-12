package ua.zwf.api.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.notification.ReminderService;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;
import ua.zwf.api.support.RecordingPushSender;

/** B-33: підписки Web Push і доставка нагадувань. */
class PushIT extends IntegrationTest {

	@Autowired
	ReminderService reminders;

	@Autowired
	RecordingPushSender push;

	@Autowired
	JdbcTemplate jdbc;

	static String endpoint() {
		return "https://push.example.test/" + UUID.randomUUID();
	}

	static Map<String, Object> subscription(String endpoint) {
		return Map.of("endpoint", endpoint, "keys", Map.of("p256dh", "BPub-key", "auth", "auth-secret"));
	}

	static void settings(ApiClient client, boolean push, Map<String, Object> quiet) {
		var body = new HashMap<String, Object>(Map.of("inApp", true, "emailDigest", false, "push", push));
		body.put("quietHours", quiet);
		client.send("PUT", "/api/me/notification-settings", body);
	}

	@Test
	void publicKeyIsNullWithoutVapidKeysAndSubscriptionIsValidated() {
		var client = Accounts.signUp(client(), "Олена");

		var key = client.get("/api/me/push/public-key").json();
		assertThat(key).containsEntry("publicKey", null);
		var bad = client.post("/api/me/push-subscriptions", Map.of("endpoint", "http://insecure", "keys", Map.of()));
		assertThat(bad.status()).isEqualTo(400);
		assertThat(bad.json()).containsEntry("errors",
				Map.of("endpoint", "INVALID", "keys.p256dh", "NotBlank", "keys.auth", "NotBlank"));
	}

	@Test
	void remindersArePushedToSubscribedBrowsersWhenPushIsOn() {
		var client = Accounts.signUp(client(), "Олена");
		String endpoint = endpoint();
		assertThat(client.post("/api/me/push-subscriptions", subscription(endpoint)).status()).isEqualTo(201);
		assertThat(client.post("/api/me/push-subscriptions", subscription(endpoint)).status()).isEqualTo(201);
		Products.create(client, Products.product("Йогурт", "dairy", 0));

		reminders.run();
		assertThat(push.sentTo(endpoint)).as("push is off by default").isEmpty();

		settings(client, true, null);
		var milk = Products.create(client, Products.product("Молоко", "dairy", 1)).get("id");
		reminders.run();

		var sent = push.sentTo(endpoint);
		assertThat(sent).hasSize(1);
		assertThat(sent.getFirst().payload()).contains("\"type\":\"EXPIRY_REMINDER\"")
			.contains("\"productName\":\"Молоко\"")
			.contains("\"productId\":\"" + milk + "\"")
			.contains("\"daysLeft\":1")
			.contains("\"url\":\"/lms/\"");
		assertThat(jdbc.queryForObject("select count(*) from push_subscription where endpoint = ?", Long.class, endpoint))
			.isEqualTo(1);
	}

	@Test
	void quietHoursSilencePushAndGoneSubscriptionsAreRemoved() {
		var client = Accounts.signUp(client(), "Олена");
		String endpoint = endpoint();
		client.post("/api/me/push-subscriptions", subscription(endpoint));
		int hour = ZonedDateTime.now(ZoneId.of("Europe/Kyiv")).getHour();
		settings(client, true, Map.of("from", hour, "to", (hour + 1) % 24));
		Products.create(client, Products.product("Сир", "dairy", 0));

		reminders.run();
		assertThat(push.sentTo(endpoint)).isEmpty();

		settings(client, true, null);
		Products.create(client, Products.product("Кефір", "dairy", 0));
		push.answer(PushSender.Result.GONE);
		try {
			reminders.run();
		}
		finally {
			push.answer(PushSender.Result.DELIVERED);
		}
		assertThat(push.sentTo(endpoint)).hasSize(1);
		assertThat(jdbc.queryForObject("select count(*) from push_subscription where endpoint = ?", Long.class, endpoint))
			.isZero();
	}

	@Test
	void unsubscribeOnlyOwnSubscription() {
		var olena = Accounts.signUp(client(), "Олена");
		String endpoint = endpoint();
		olena.post("/api/me/push-subscriptions", subscription(endpoint));
		var stranger = Accounts.signUp(client(), "Сусід");

		assertThat(stranger.send("DELETE", "/api/me/push-subscriptions", Map.of("endpoint", endpoint)).status()).isEqualTo(204);
		assertThat(jdbc.queryForObject("select count(*) from push_subscription where endpoint = ?", Long.class, endpoint))
			.isEqualTo(1);
		olena.send("DELETE", "/api/me/push-subscriptions", Map.of("endpoint", endpoint));
		assertThat(jdbc.queryForObject("select count(*) from push_subscription where endpoint = ?", Long.class, endpoint))
			.isZero();
	}

}
