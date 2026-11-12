package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;

/** B-34: /api/me/notification-settings і вплив на нагадування. */
class NotificationSettingsIT extends IntegrationTest {

	@Autowired
	ReminderService reminders;

	@Autowired
	JdbcTemplate jdbc;

	static final Map<String, Object> DEFAULTS = new HashMap<>(Map.of("inApp", true, "emailDigest", true, "push", false,
			"digestHour", 8));

	static {
		DEFAULTS.put("quietHours", null);
	}

	@Test
	void defaultsThenSaveAndValidate() {
		var client = Accounts.signUp(client(), "Олена");
		assertThat(client.get("/api/me/notification-settings").json()).isEqualTo(DEFAULTS);
		assertThat(client().get("/api/me/notification-settings").status()).isEqualTo(401);

		var saved = client.send("PUT", "/api/me/notification-settings", Map.of("inApp", true, "emailDigest", false,
				"push", true, "digestHour", 20, "quietHours", Map.of("from", 22, "to", 7)));
		assertThat(saved.status()).as(saved.body()).isEqualTo(200);
		assertThat(saved.json()).isEqualTo(Map.of("inApp", true, "emailDigest", false, "push", true, "digestHour", 20,
				"quietHours", Map.of("from", 22, "to", 7)));
		assertThat(client.get("/api/me/notification-settings").json()).isEqualTo(saved.json());

		var bad = client.send("PUT", "/api/me/notification-settings",
				Map.of("inApp", true, "digestHour", 24, "quietHours", Map.of("from", 5, "to", 5)));
		assertThat(bad.status()).isEqualTo(400);
		assertThat(bad.json()).containsEntry("errors",
				Map.of("emailDigest", "NotNull", "push", "NotNull", "digestHour", "Range", "quietHours.to", "SAME_AS_FROM"));
	}

	@Test
	@SuppressWarnings("unchecked")
	void memberWithoutAnyChannelGetsNoReminders() {
		var olena = Accounts.signUp(client(), "Олена");
		var maksym = Accounts.signUp(client(), "Максим");
		Family.join(jdbc, olena, maksym, "MEMBER");
		maksym.send("PUT", "/api/me/notification-settings", Map.of("inApp", false, "emailDigest", true, "push", false));
		Products.create(olena, Products.product("Йогурт", "dairy", 0));

		reminders.run();

		assertThat((List<Object>) olena.get("/api/notifications").json().get("items")).hasSize(1);
		assertThat((List<Object>) maksym.get("/api/notifications").json().get("items")).isEmpty();
	}

}
