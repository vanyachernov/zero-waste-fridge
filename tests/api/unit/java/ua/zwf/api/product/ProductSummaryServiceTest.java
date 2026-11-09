package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.common.Today;

class ProductSummaryServiceTest {

	@Test
	@SuppressWarnings("unchecked")
	void passesUsersDateAndWeekWindowAndMapsNullsToZero() {
		var em = mock(EntityManager.class);
		TypedQuery<Object[]> query = mock(TypedQuery.class, RETURNS_SELF);
		when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
		when(query.getSingleResult()).thenReturn(new Object[] { 3L, 2L, null, 1L, 0L });
		var clock = Clock.fixed(Instant.parse("2026-11-09T23:30:00Z"), ZoneOffset.UTC);
		var service = new ProductSummaryService(em, clock, new Today(clock, ZoneId.of("Europe/Kyiv")));
		var household = UUID.randomUUID();

		var summary = service.summary(household);

		assertThat(summary).isEqualTo(new ProductSummary(3, 2, 0, 1, 0));
		verify(query).setParameter("household", household);
		verify(query).setParameter("active", ProductStatus.ACTIVE);
		verify(query).setParameter("today", LocalDate.of(2026, 11, 10));
		verify(query).setParameter("soonEnd", LocalDate.of(2026, 11, 12));
		verify(query).setParameter("weekAgo", Instant.parse("2026-11-02T23:30:00Z"));
	}

}
