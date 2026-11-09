package ua.zwf.api.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class TodayTest {

	@Test
	void usesUsersTimeZoneNotServerUtc() {
		// 23:30 UTC 9 листопада = 01:30 10 листопада за Києвом
		var clock = Clock.fixed(Instant.parse("2026-11-09T23:30:00Z"), ZoneOffset.UTC);

		assertThat(new Today(clock, ZoneId.of("Europe/Kyiv")).date()).isEqualTo(LocalDate.of(2026, 11, 10));
		assertThat(new Today(clock, ZoneOffset.UTC).date()).isEqualTo(LocalDate.of(2026, 11, 9));
		assertThat(new Today(clock, ZoneId.of("Europe/Kyiv")).zone()).isEqualTo(ZoneId.of("Europe/Kyiv"));
	}

}
