package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ua.zwf.api.common.Today;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;
import ua.zwf.api.support.RecordingMailer;
import ua.zwf.api.support.TestData;

/** B-33: щоденний email-дайджест. */
class DigestIT extends IntegrationTest {

	@Autowired
	DigestService digest;

	@Autowired
	RecordingMailer mailer;

	@Autowired
	Today today;

	static void digestAt(ApiClient client, String time, boolean on) {
		client.send("PUT", "/api/me/notification-settings",
				Map.of("inApp", true, "emailDigest", on, "push", false, "digestTime", time));
	}

	int runAt(String time) {
		return digest.run(today.date(), LocalTime.parse(time));
	}

	@Test
	void sendsOncePerDayAtTheChosenMinuteWithUrgentProducts() {
		String email = TestData.uniqueEmail();
		var client = Accounts.signUp(client(), "Олена Кравченко", email);
		digestAt(client, "20:31", true);
		Products.create(client, Products.product("Фарш", "meat", -1));
		Products.create(client, Products.product("Йогурт", "dairy", 1));
		Products.create(client, Products.product("Сир", "dairy", 5));

		runAt("20:30");
		assertThat(mailer.sentTo(email)).isEmpty();

		runAt("20:31");
		var mails = mailer.sentTo(email);
		assertThat(mails).hasSize(1);
		assertThat(mails.getFirst().subject()).isEqualTo("Zero Waste Fridge — 2 продукти потребують уваги");
		assertThat(mails.getFirst().text()).contains("- Фарш — прострочено").contains("- Йогурт — завтра").doesNotContain("Сир")
			.contains("/lms/");

		runAt("20:32");
		runAt("23:59");
		assertThat(mailer.sentTo(email)).hasSize(1);
	}

	@Test
	void missedMinuteIsCaughtUpLaterThatDay() {
		String email = TestData.uniqueEmail();
		var client = Accounts.signUp(client(), "Після рестарту", email);
		digestAt(client, "07:15", true);
		Products.create(client, Products.product("Молоко", "dairy", 0));

		runAt("09:02");

		assertThat(mailer.sentTo(email)).hasSize(1);
	}

	@Test
	void laterTimeDisabledOrNothingUrgentMeansNoMail() {
		String other = TestData.uniqueEmail();
		var later = Accounts.signUp(client(), "Пізніше", other);
		digestAt(later, "21:00", true);
		Products.create(later, Products.product("Фарш", "meat", 0));

		String off = TestData.uniqueEmail();
		var disabled = Accounts.signUp(client(), "Вимкнено", off);
		digestAt(disabled, "12:00", false);
		Products.create(disabled, Products.product("Фарш", "meat", 0));

		String calm = TestData.uniqueEmail();
		var nothing = Accounts.signUp(client(), "Усе свіже", calm);
		digestAt(nothing, "12:00", true);
		Products.create(nothing, Products.product("Сир", "dairy", 9));

		runAt("12:00");
		assertThat(mailer.sentTo(other)).isEmpty();
		assertThat(mailer.sentTo(off)).isEmpty();
		assertThat(mailer.sentTo(calm)).isEmpty();

		// Тихий день уже «відпрацьовано» — новий терміновий продукт дочекається завтрашнього листа
		Products.create(nothing, Products.product("Фарш", "meat", 0));
		runAt("12:05");
		assertThat(mailer.sentTo(calm)).isEmpty();
	}

}
