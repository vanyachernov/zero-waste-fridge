package ua.zwf.api.notification;

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

/** B-31: нагадування про терміни для всіх учасників сім'ї. */
class ReminderIT extends IntegrationTest {

	@Autowired
	ReminderService reminders;

	@Autowired
	JdbcTemplate jdbc;

	static Object product(ApiClient client, String name, int daysLeft, int remindBefore) {
		var body = Products.product(name, "dairy", daysLeft);
		body.put("remindBeforeDays", remindBefore);
		return Products.create(client, body).get("id");
	}

	@SuppressWarnings("unchecked")
	static List<String> names(ApiClient client) {
		var items = (List<Map<String, Object>>) client.get("/api/notifications").json().get("items");
		return items.stream().map(i -> (String) ((Map<String, Object>) i.get("product")).get("name")).toList();
	}

	@Test
	void remindsEveryMemberOnceWhenTheLeadTimeComes() {
		var olena = Accounts.signUp(client(), "Олена");
		var maksym = Accounts.signUp(client(), "Максим");
		Family.join(jdbc, olena, maksym, "MEMBER");
		product(olena, "Йогурт", 2, 2); // час нагадати: 2 − 2 ≤ сьогодні
		product(olena, "Сир", 5, 2); // ще рано
		product(olena, "Фарш", -1, 1); // уже прострочений — теж нагадуємо
		var eaten = product(olena, "Молоко", 1, 3);
		olena.post("/api/products/" + eaten + "/write-off", Map.of("outcome", "EATEN"));

		reminders.run();

		assertThat(names(olena)).containsExactlyInAnyOrder("Йогурт", "Фарш");
		assertThat(names(maksym)).containsExactlyInAnyOrder("Йогурт", "Фарш");
		@SuppressWarnings("unchecked")
		var yogurt = ((List<Map<String, Object>>) olena.get("/api/notifications").json().get("items")).stream()
			.filter(i -> ((Map<String, Object>) i.get("product")).get("name").equals("Йогурт"))
			.findFirst()
			.orElseThrow();
		assertThat(yogurt).containsEntry("daysLeft", 2).containsEntry("type", "EXPIRY_REMINDER");

		reminders.run();
		assertThat(names(olena)).hasSize(2);
	}

	@Test
	void newExpiryMeansANewReminder() {
		var olena = Accounts.signUp(client(), "Олена");
		var milk = product(olena, "Молоко", 10, 2);
		reminders.run();
		assertThat(names(olena)).isEmpty();

		// Відкрили упаковку: термін скоротився до 3 днів (молоко), нагадування за 3 дні — час нагадати
		olena.patch("/api/products/" + milk, Map.of("openedAt", Products.TODAY.toString(), "remindBeforeDays", 3));
		reminders.run();
		assertThat(names(olena)).containsExactly("Молоко");

		olena.patch("/api/products/" + milk, Map.of("expiresAt", Products.TODAY.plusDays(2).toString()));
		reminders.run();
		assertThat(names(olena)).containsExactly("Молоко", "Молоко");
	}

	@Test
	void otherHouseholdsAreNotNotified() {
		var olena = Accounts.signUp(client(), "Олена");
		var stranger = Accounts.signUp(client(), "Сусід");
		product(olena, "Йогурт", 0, 1);

		reminders.run();

		assertThat(names(stranger)).isEmpty();
		assertThat(names(olena)).containsExactly("Йогурт");
	}

}
