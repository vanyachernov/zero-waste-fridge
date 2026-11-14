package ua.zwf.api.activity;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.product.ProductEvent;
import ua.zwf.api.product.ProductEventType;
import ua.zwf.api.shopping.ShoppingItem;
import ua.zwf.api.user.User;

/**
 * B-53: стрічка дій домогосподарства. Окремої таблиці немає — збираємо з того, що вже зберігає актора:
 * {@code product_event} (додано / змінено / відкрито / списано) і {@code shopping_item} (хто додав і хто купив).
 * З кожного джерела беремо не більше {@code limit} найновіших записів, зливаємо й обрізаємо.
 */
@Service
public class ActivityService {

	public static final int DEFAULT_LIMIT = 20;

	public static final int MAX_LIMIT = 100;

	/** Пізніше за будь-яку реальну дію, але без переповнення TIMESTAMPTZ. */
	static final Instant FAR_FUTURE = Instant.parse("9999-01-01T00:00:00Z");

	private final EntityManager em;

	public ActivityService(EntityManager em) {
		this.em = em;
	}

	@Transactional(readOnly = true)
	public ActivityPage feed(UUID householdId, Instant before, int limit) {
		if (limit < 1 || limit > MAX_LIMIT) {
			throw new ValidationException(Map.of("limit", "Range"));
		}
		var items = collect(householdId, null, before == null ? FAR_FUTURE : before, limit);
		Instant next = items.size() == limit ? items.getLast().at() : null;
		return new ActivityPage(items, next);
	}

	/** «Остання дія» учасника в таблиці «Учасники» (B-51). */
	@Transactional(readOnly = true)
	public Optional<ActivityEntry> latestOf(UUID householdId, UUID userId) {
		return collect(householdId, userId, FAR_FUTURE, 1).stream().findFirst();
	}

	List<ActivityEntry> collect(UUID householdId, UUID actorId, Instant before, int limit) {
		List<ActivityEntry> all = new ArrayList<>();
		productEvents(householdId, actorId, before, limit).forEach(e -> all.add(of(e)));
		shoppingAdded(householdId, actorId, before, limit).forEach(i -> all.add(added(i)));
		shoppingBought(householdId, actorId, before, limit).forEach(i -> all.add(bought(i)));
		return all.stream()
			.sorted(Comparator.comparing(ActivityEntry::at).reversed().thenComparing(e -> e.type().ordinal()))
			.limit(limit)
			.toList();
	}

	private List<ProductEvent> productEvents(UUID householdId, UUID actorId, Instant before, int limit) {
		return em.createQuery("""
				select e from ProductEvent e join fetch e.product left join fetch e.actor
				where e.household.id = :household and e.occurredAt < :before
				  and (:actor is null or e.actor.id = :actor)
				order by e.occurredAt desc""", ProductEvent.class)
			.setParameter("household", householdId)
			.setParameter("before", before)
			.setParameter("actor", actorId)
			.setMaxResults(limit)
			.getResultList();
	}

	private List<ShoppingItem> shoppingAdded(UUID householdId, UUID actorId, Instant before, int limit) {
		// Автопоповнення (AUTO) — не дія людини, навіть якщо його спричинило списання
		return em.createQuery("""
				select i from ShoppingItem i left join fetch i.addedBy
				where i.household.id = :household and i.createdAt < :before
				  and i.source <> ua.zwf.api.shopping.ShoppingSource.AUTO
				  and (:actor is null or i.addedBy.id = :actor)
				order by i.createdAt desc""", ShoppingItem.class)
			.setParameter("household", householdId)
			.setParameter("before", before)
			.setParameter("actor", actorId)
			.setMaxResults(limit)
			.getResultList();
	}

	private List<ShoppingItem> shoppingBought(UUID householdId, UUID actorId, Instant before, int limit) {
		return em.createQuery("""
				select i from ShoppingItem i left join fetch i.boughtBy
				where i.household.id = :household and i.boughtAt is not null and i.boughtAt < :before
				  and (:actor is null or i.boughtBy.id = :actor)
				order by i.boughtAt desc""", ShoppingItem.class)
			.setParameter("household", householdId)
			.setParameter("before", before)
			.setParameter("actor", actorId)
			.setMaxResults(limit)
			.getResultList();
	}

	static ActivityEntry of(ProductEvent e) {
		var type = switch (e.getType()) {
			case ADDED -> ActivityType.PRODUCT_ADDED;
			case UPDATED -> ActivityType.PRODUCT_UPDATED;
			case OPENED -> ActivityType.PRODUCT_OPENED;
			case WRITTEN_OFF -> ActivityType.PRODUCT_WRITTEN_OFF;
		};
		var product = e.getProduct();
		boolean writeOff = e.getType() == ProductEventType.WRITTEN_OFF;
		return new ActivityEntry(type, e.getOccurredAt(), person(e.getActor()),
				new ActivityEntry.Subject(ActivityEntry.SubjectKind.PRODUCT, product.getId(), product.getName()),
				e.getOutcome(), writeOff ? plain(e.getQuantity()) : null, writeOff ? e.getUnit() : null);
	}

	static ActivityEntry added(ShoppingItem i) {
		return new ActivityEntry(ActivityType.SHOPPING_ADDED, i.getCreatedAt(), person(i.getAddedBy()),
				new ActivityEntry.Subject(ActivityEntry.SubjectKind.SHOPPING_ITEM, i.getId(), i.getName()), null, null,
				null);
	}

	static ActivityEntry bought(ShoppingItem i) {
		return new ActivityEntry(ActivityType.SHOPPING_BOUGHT, i.getBoughtAt(), person(i.getBoughtBy()),
				new ActivityEntry.Subject(ActivityEntry.SubjectKind.SHOPPING_ITEM, i.getId(), i.getName()), null, null,
				null);
	}

	private static ActivityEntry.Person person(User user) {
		return user == null ? null : new ActivityEntry.Person(user.getId(), user.getName());
	}

	private static BigDecimal plain(BigDecimal value) {
		if (value == null) {
			return null;
		}
		BigDecimal stripped = value.stripTrailingZeros();
		return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
	}

}
