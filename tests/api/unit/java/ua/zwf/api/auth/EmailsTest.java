package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class EmailsTest {

	@ParameterizedTest
	@CsvSource({ "Olena@Example.COM, olena@example.com", "'  max@zwf.app  ', max@zwf.app", "a@b.c, a@b.c" })
	void normalizesCaseAndWhitespace(String input, String expected) {
		assertThat(Emails.normalize(input)).isEqualTo(expected);
	}

	@Test
	void usesLocaleIndependentLowercase() {
		// Турецька локаль перетворила б «I» на «ı» — нормалізація не повинна від неї залежати
		assertThat(Emails.normalize("IVAN@ZWF.APP")).isEqualTo("ivan@zwf.app");
	}

	@Test
	void keepsNull() {
		assertThat(Emails.normalize(null)).isNull();
	}

}
