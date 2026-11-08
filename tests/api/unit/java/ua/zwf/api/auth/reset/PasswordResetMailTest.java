package ua.zwf.api.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class PasswordResetMailTest {

	@Test
	void linkPointsToSpaResetPage() {
		assertThat(PasswordResetMail.link("https://zwf.app", "tok_en-1"))
			.isEqualTo("https://zwf.app/lms/reset-password?token=tok_en-1");
	}

	@Test
	void textAndHtmlContainLinkTtlAndName() {
		var link = "https://zwf.app/lms/reset-password?token=abc";

		var mail = PasswordResetMail.create("olena@example.com", "Олена", link, Duration.ofHours(1));

		assertThat(mail.to()).isEqualTo("olena@example.com");
		assertThat(mail.subject()).isEqualTo(PasswordResetMail.SUBJECT);
		assertThat(mail.text()).contains("Вітаємо, Олена!").contains(link).contains("60 хв");
		assertThat(mail.html()).contains("href=\"" + link + "\"").contains("60 хв");
	}

	@Test
	void htmlEscapesUserControlledName() {
		var mail = PasswordResetMail.create("x@y.z", "<script>alert(1)</script>", "https://zwf.app/x?token=a&b",
				Duration.ofMinutes(30));

		assertThat(mail.html()).doesNotContain("<script>").contains("&lt;script&gt;").contains("token=a&amp;b");
	}

}
