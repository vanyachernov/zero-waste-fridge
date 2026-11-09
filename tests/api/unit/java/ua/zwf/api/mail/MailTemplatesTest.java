package ua.zwf.api.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** B-30: шаблони листів Thymeleaf. */
class MailTemplatesTest {

	static final MailTemplates TEMPLATES = new MailTemplates();

	@Test
	void inviteRendersHtmlAndTextWithUkrainianDate() {
		var mail = TEMPLATES.render("max@zwf.app", "Запрошення", "household-invite",
				Map.of("inviter", "Олена Кравченко", "household", "Сім'я Кравченко", "roleLabel", "Член сім'ї",
						"link", "https://zwf.app/lms/join?invite=abc&x=1", "expiresAt", LocalDate.of(2026, 11, 16)));

		assertThat(mail.to()).isEqualTo("max@zwf.app");
		assertThat(mail.html()).contains("Олена Кравченко")
			.contains("Сім&#39;я Кравченко")
			.contains("href=\"https://zwf.app/lms/join?invite=abc&amp;x=1\"")
			.contains("16 листопада 2026")
			.contains("Приєднатися до сімʼї")
			.contains("Zero Waste Fridge");
		assertThat(mail.text()).contains("Олена Кравченко запрошує вас до «Сім'я Кравченко»")
			.contains("Приєднатися: https://zwf.app/lms/join?invite=abc&x=1")
			.contains("16 листопада 2026")
			.doesNotContain("<");
	}

	@Test
	void digestListsProductsWithLabels() {
		var products = List.of(ExpiryDigestMail.Line.of("Фарш", -1), ExpiryDigestMail.Line.of("Йогурт", 1),
				ExpiryDigestMail.Line.of("Сир", 2));

		var mail = ExpiryDigestMail.create(TEMPLATES, "olena@example.com", "Олена", "Сім'я Кравченко", products,
				"https://zwf.app/lms/");

		assertThat(mail.subject()).isEqualTo("Zero Waste Fridge — 3 продукти потребують уваги");
		assertThat(mail.text()).contains("- Фарш — прострочено").contains("- Йогурт — завтра")
			.contains("- Сир — через 2 дні");
		assertThat(mail.html()).contains("Фарш").contains("color:#ba0035").contains("Відкрити холодильник");
	}

	@Test
	void htmlEscapesUserInput() {
		var mail = TEMPLATES.render("x@y.z", "S", "household-invite", Map.of("inviter", "<img src=x onerror=alert(1)>",
				"household", "<b>", "roleLabel", "Член сім'ї", "link", "https://zwf.app", "expiresAt",
				LocalDate.of(2026, 1, 1)));

		assertThat(mail.html()).doesNotContain("<img").contains("&lt;img src=x onerror=alert(1)&gt;");
	}

	@Test
	void unknownTemplateFails() {
		assertThatThrownBy(() -> TEMPLATES.render("x@y.z", "S", "no-such-mail", Map.of()))
			.hasMessageContaining("no-such-mail");
	}

	@ParameterizedTest(name = "{0} → {1}")
	@CsvSource({ "1, день", "2, дні", "4, дні", "5, днів", "11, днів", "14, днів", "21, день", "22, дні", "25, днів",
			"111, днів", "101, день" })
	void ukrainianPlurals(long n, String form) {
		assertThat(Plural.uk(n, "день", "дні", "днів")).isEqualTo(form);
	}

	@Test
	void digestSubjectPlural() {
		assertThat(ExpiryDigestMail.subjectCount(1)).isEqualTo("1 продукт потребує уваги");
		assertThat(ExpiryDigestMail.subjectCount(5)).isEqualTo("5 продуктів потребують уваги");
		assertThat(ExpiryDigestMail.label(0)).isEqualTo("сьогодні");
		assertThat(ExpiryDigestMail.label(7)).isEqualTo("через 7 днів");
	}

}
