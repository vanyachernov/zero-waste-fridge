package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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

	static int hourNow() {
		return ZonedDateTime.now(ZoneId.of("Europe/Kyiv")).getHour();
	}

	static void digestAt(ApiClient client, int hour, boolean on) {
		client.send("PUT", "/api/me/notification-settings",
				Map.of("inApp", true, "emailDigest", on, "push", false, "digestHour", hour));
	}

	@Test
	void sendsOncePerDayAtTheChosenHourWithUrgentProducts() {
		String email = TestData.uniqueEmail();
		var client = Accounts.signUp(client(), "Олена Кравченко", email);
		digestAt(client, hourNow(), true);
		Products.create(client, Products.product("Фарш", "meat", -1));
		Products.create(client, Products.product("Йогурт", "dairy", 1));
		Products.create(client, Products.product("Сир", "dairy", 5));

		digest.run();

		var mails = mailer.sentTo(email);
		assertThat(mails).hasSize(1);
		assertThat(mails.getFirst().subject()).isEqualTo("Zero Waste Fridge — 2 продукти потребують уваги");
		assertThat(mails.getFirst().text()).contains("- Фарш — прострочено").contains("- Йогурт — завтра").doesNotContain("Сир")
			.contains("/lms/");

		digest.run();
		assertThat(mailer.sentTo(email)).hasSize(1);
	}

	@Test
	void otherHourDisabledOrNothingUrgentMeansNoMail() {
		String other = TestData.uniqueEmail();
		var otherHour = Accounts.signUp(client(), "Інша година", other);
		digestAt(otherHour, (hourNow() + 3) % 24, true);
		Products.create(otherHour, Products.product("Фарш", "meat", 0));

		String off = TestData.uniqueEmail();
		var disabled = Accounts.signUp(client(), "Вимкнено", off);
		digestAt(disabled, hourNow(), false);
		Products.create(disabled, Products.product("Фарш", "meat", 0));

		String calm = TestData.uniqueEmail();
		var nothing = Accounts.signUp(client(), "Усе свіже", calm);
		digestAt(nothing, hourNow(), true);
		Products.create(nothing, Products.product("Сир", "dairy", 9));

		digest.run();

		assertThat(mailer.sentTo(other)).isEmpty();
		assertThat(mailer.sentTo(off)).isEmpty();
		assertThat(mailer.sentTo(calm)).isEmpty();
	}

}
