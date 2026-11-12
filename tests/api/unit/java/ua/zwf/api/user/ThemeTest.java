package ua.zwf.api.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ThemeTest {

	@ParameterizedTest(name = "{0} → {1}")
	@CsvSource({ "light, LIGHT", "DARK, DARK", "' system ', SYSTEM" })
	void parsesApiValues(String value, Theme theme) {
		assertThat(Theme.parse(value)).contains(theme);
		assertThat(theme.api()).isEqualTo(theme.name().toLowerCase());
	}

	@Test
	void rejectsUnknownValues() {
		assertThat(Theme.parse("sepia")).isEmpty();
		assertThat(Theme.parse(null)).isEmpty();
	}

	@Test
	void systemIsStoredAsNull() {
		var user = new User("olena@example.com", "Олена", "{bcrypt}x", Instant.EPOCH);
		assertThat(user.getTheme()).isEqualTo(Theme.SYSTEM);

		user.changeTheme(Theme.DARK, Instant.EPOCH);
		assertThat(user.getTheme()).isEqualTo(Theme.DARK);

		user.changeTheme(Theme.SYSTEM, Instant.EPOCH);
		assertThat(user.getTheme()).isEqualTo(Theme.SYSTEM);
	}

}
