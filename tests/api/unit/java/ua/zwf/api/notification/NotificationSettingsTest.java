package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
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
		assertThat(s.getDigestTime()).isEqualTo(LocalTime.of(8, 0));
		assertThat(s.wantsReminders()).isTrue();
		assertThat(s.isQuiet(3)).isFalse();
	}

	@ParameterizedTest(name = "тиша {0}..{1}, {2}:00 → {3}")
	@CsvSource({ "22, 7, 23, true", "22, 7, 3, true", "22, 7, 7, false", "22, 7, 12, false", "13, 15, 14, true",
			"13, 15, 15, false", "13, 15, 12, false" })
	void quietHoursIncludingOverMidnight(int from, int to, int hour, boolean quiet) {
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.update(true, true, true, LocalTime.of(8, 0), from, to, Instant.EPOCH);

		assertThat(s.isQuiet(hour)).isEqualTo(quiet);
	}

	@Test
	void noChannelForReminders() {
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.update(false, true, false, LocalTime.of(8, 0), null, null, Instant.EPOCH);

		assertThat(s.wantsReminders()).isFalse();
	}

	@ParameterizedTest(name = "лист о 20:31, зараз {0} → {1}")
	@CsvSource({ "20:30, false", "20:31, true", "23:59, true", "00:00, false" })
	void digestIsDueFromTheChosenMinute(String now, boolean due) {
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.update(true, true, false, LocalTime.of(20, 31, 45), null, null, Instant.EPOCH);

		assertThat(s.getDigestTime()).isEqualTo(LocalTime.of(20, 31));
		assertThat(s.isDigestDue(LocalDate.of(2026, 11, 12), LocalTime.parse(now))).isEqualTo(due);
	}

	@Test
	void digestIsNotDueTwiceADayOrWhenDisabled() {
		var date = LocalDate.of(2026, 11, 12);
		var s = NotificationSettings.defaults(UUID.randomUUID());
		s.markDigestSent(date);
		assertThat(s.isDigestDue(date, LocalTime.NOON)).isFalse();
		assertThat(s.isDigestDue(date.plusDays(1), LocalTime.NOON)).isTrue();

		s.update(true, false, false, LocalTime.of(8, 0), null, null, Instant.EPOCH);
		assertThat(s.isDigestDue(date.plusDays(1), LocalTime.NOON)).isFalse();
	}

}
