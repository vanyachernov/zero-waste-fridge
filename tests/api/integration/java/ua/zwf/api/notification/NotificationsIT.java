package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;

/** B-32: /api/notifications. */
class NotificationsIT extends IntegrationTest {

	@Autowired
	NotificationRepository notifications;

	@Autowired
	JdbcTemplate jdbc;

	UUID add(ApiClient client, String product, int daysLeft, Instant at) {
		return notifications.save(new Notification(Family.userId(client), Family.householdId(client),
				NotificationType.EXPIRY_REMINDER, null, product, daysLeft, at)).getId();
	}

	@SuppressWarnings("unchecked")
	static List<Map<String, Object>> items(Map<String, Object> json) {
		return (List<Map<String, Object>>) json.get("items");
	}

	@Test
	void emptyFeedAndSession() {
		var client = Accounts.signUp(client(), "Олена");

		assertThat(client.get("/api/notifications").json()).isEqualTo(Map.of("items", List.of(), "unread", 0));
		assertThat(client().get("/api/notifications").status()).isEqualTo(401);
	}

	@Test
	@SuppressWarnings("unchecked")
	void unreadFirstThenNewestWithCount() {
		var client = Accounts.signUp(client(), "Олена");
		var old = add(client, "Сир", 2, Instant.parse("2026-11-01T10:00:00Z"));
		add(client, "Йогурт", 1, Instant.parse("2026-11-03T10:00:00Z"));
		var read = add(client, "Молоко", 0, Instant.parse("2026-11-05T10:00:00Z"));
		assertThat(client.post("/api/notifications/" + read + "/read", null).status()).isEqualTo(204);
		assertThat(client.post("/api/notifications/" + read + "/read", null).status()).isEqualTo(204);

		var json = client.get("/api/notifications").json();
		assertThat(items(json)).extracting(i -> ((Map<String, Object>) i.get("product")).get("name"))
			.containsExactly("Йогурт", "Сир", "Молоко");
		assertThat(items(json).getFirst()).containsEntry("type", "EXPIRY_REMINDER")
			.containsEntry("read", false)
			.containsEntry("daysLeft", 1);
		assertThat(json).containsEntry("unread", 2);
		assertThat(client.get("/api/notifications/unread-count").json()).isEqualTo(Map.of("count", 2));
		assertThat(items(client.get("/api/notifications?limit=1").json())).hasSize(1);
		assertThat(client.get("/api/notifications?limit=0").json()).containsEntry("errors", Map.of("limit", "Range"));

		assertThat(client.post("/api/notifications/read-all", null).json()).isEqualTo(Map.of("updated", 2));
		assertThat(client.get("/api/notifications/unread-count").json()).isEqualTo(Map.of("count", 0));
		assertThat(old).isNotNull();
	}

	@Test
	void foreignNotificationIsNotFoundAndOldHouseholdIsHidden() {
		var olena = Accounts.signUp(client(), "Олена");
		var id = add(olena, "Сир", 2, Instant.parse("2026-11-01T10:00:00Z"));
		var stranger = Accounts.signUp(client(), "Сусід");

		var response = stranger.post("/api/notifications/" + id + "/read", null);
		assertThat(response.status()).isEqualTo(404);
		assertThat(response.json()).containsEntry("code", "NOTIFICATION_NOT_FOUND");

		// Олена переходить до сусіда — старі сповіщення її колишньої сім'ї не показуються
		Family.join(jdbc, stranger, olena, "MEMBER");
		assertThat(olena.get("/api/notifications").json()).containsEntry("unread", 0);
	}

}
