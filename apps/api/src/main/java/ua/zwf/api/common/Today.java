package ua.zwf.api.common;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * «Сьогодні» для календарних термінів придатності. Дата на упаковці не має часового поясу, тож рахуємо
 * її в поясі користувачів ({@code zwf.time-zone}, за замовчуванням Europe/Kyiv), а не в UTC сервера:
 * інакше о 01:00 за Києвом продукт «з терміном до сьогодні» ще вважався б учорашнім.
 */
@Component
public class Today {

	private final Clock clock;

	private final ZoneId zone;

	public Today(Clock clock, @Value("${zwf.time-zone:Europe/Kyiv}") ZoneId zone) {
		this.clock = clock;
		this.zone = zone;
	}

	public LocalDate date() {
		return LocalDate.now(clock.withZone(zone));
	}

	public ZoneId zone() {
		return zone;
	}

}
