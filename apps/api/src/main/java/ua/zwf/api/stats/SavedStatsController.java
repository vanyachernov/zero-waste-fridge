package ua.zwf.api.stats;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.CurrentHousehold;
import ua.zwf.api.product.ProductEventType;
import ua.zwf.api.product.WriteOffOutcome;

/** B-24: «Врятовано від смітника: N продуктів цього місяця». */
@Tag(name = "stats")
@RestController
@RequestMapping("/api/stats")
class SavedStatsController {

	/**
	 * @param saved скільки різних продуктів з'їли вчасно або приготували
	 * @param wasted скільки викинули — для чесного порівняння
	 * @param from перший день періоду (включно), {@code to} — останній
	 */
	record SavedStats(String period, LocalDate from, LocalDate to, long saved, long wasted) {
	}

	private final EntityManager em;

	private final CurrentHousehold household;

	private final Today today;

	SavedStatsController(EntityManager em, CurrentHousehold household, Today today) {
		this.em = em;
		this.household = household;
		this.today = today;
	}

	@Operation(summary = "Products saved (eaten or cooked) vs wasted this month")
	@GetMapping("/saved")
	@Transactional(readOnly = true)
	SavedStats saved(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(defaultValue = "month") String period) {
		if (!"month".equals(period)) {
			throw new ValidationException(Map.of("period", "INVALID"));
		}
		UUID householdId = household.idOf(principal.id());
		LocalDate from = today.date().withDayOfMonth(1);
		LocalDate to = from.plusMonths(1).minusDays(1);
		var start = from.atStartOfDay(today.zone()).toInstant();
		var end = from.plusMonths(1).atStartOfDay(today.zone()).toInstant();
		return new SavedStats(period, from, to,
				count(householdId, List.of(WriteOffOutcome.EATEN, WriteOffOutcome.COOKED), start, end),
				count(householdId, List.of(WriteOffOutcome.WASTED), start, end));
	}

	private long count(UUID householdId, List<WriteOffOutcome> outcomes, java.time.Instant start, java.time.Instant end) {
		return em.createQuery("""
				select count(distinct e.product.id) from ProductEvent e
				where e.household.id = :household and e.type = :type and e.outcome in :outcomes
				  and e.occurredAt >= :start and e.occurredAt < :end""", Long.class)
			.setParameter("household", householdId)
			.setParameter("type", ProductEventType.WRITTEN_OFF)
			.setParameter("outcomes", outcomes)
			.setParameter("start", start)
			.setParameter("end", end)
			.getSingleResult();
	}

}
