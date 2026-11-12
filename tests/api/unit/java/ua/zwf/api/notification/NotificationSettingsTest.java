package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class NotificationSettingsTest {

	@Test
	void defaults() {
		var s = NotificationSettings.defaults(UUID.randomUUID());

		assertThat(s.isInApp()).isTrue();
		assertThat(s.isEmailDigest()).isTrue();
		assertThat(s.isPush()).isFalse();
		assertThat(s.getDigestHour()).isEqualTo(8);
		assertThat(s.wantsReminders()).isTrue();
		assertThat(s.isQuiet(3)).isFalse();
	}

	@ParameterizedTest(name = "тиша {0}..{1}, {2}:00 → {3}")
	@CsvSource({ "22, 7, 23, true", "22, 7, 3, true", "22, 7, 7, false", "22, 7, 12, false", "13, 15, 14, true",
			"13, 15, 15, false", "13, 15, 12, false" })
	void quietHoursIncludingOverMidnight(int from, int to, int hour, boolean quiet) {
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.update(true, true, true, 8, from, to, Instant.EPOCH);

		assertThat(s.isQuiet(hour)).isEqualTo(quiet);
	}

	@Test
	void noChannelForReminders() {
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.update(false, true, false, 8, null, null, Instant.EPOCH);

		assertThat(s.wantsReminders()).isFalse();
	}

}
