package ua.zwf.api.product;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;

@Service
public class ProductSummaryService {

	static final Duration WEEK = Duration.ofDays(7);

	private final EntityManager em;

	private final Clock clock;

	private final Today today;

	public ProductSummaryService(EntityManager em, Clock clock, Today today) {
		this.em = em;
		this.clock = clock;
		this.today = today;
	}

	/** Один запит з умовними лічильниками замість чотирьох окремих COUNT. */
	@Transactional(readOnly = true)
	public ProductSummary summary(UUID householdId) {
		var date = today.date();
		Object[] row = em.createQuery("""
				select count(p),
				       coalesce(sum(case when p.createdAt >= :weekAgo then 1 else 0 end), 0),
				       coalesce(sum(case when p.effectiveExpiresAt between :today and :soonEnd then 1 else 0 end), 0),
				       coalesce(sum(case when p.effectiveExpiresAt = :today then 1 else 0 end), 0),
				       coalesce(sum(case when p.effectiveExpiresAt < :today then 1 else 0 end), 0)
				from Product p
				where p.household.id = :household and p.status = :active""", Object[].class)
			.setParameter("household", householdId)
			.setParameter("active", ProductStatus.ACTIVE)
			.setParameter("weekAgo", clock.instant().minus(WEEK))
			.setParameter("today", date)
			.setParameter("soonEnd", date.plusDays(Freshness.SOON_MAX_DAYS))
			.getSingleResult();
		return new ProductSummary(count(row[0]), count(row[1]), count(row[2]), count(row[3]), count(row[4]));
	}

	private static long count(Object value) {
		return value == null ? 0 : ((Number) value).longValue();
	}

}
