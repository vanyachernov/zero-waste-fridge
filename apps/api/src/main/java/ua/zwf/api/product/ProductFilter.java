package ua.zwf.api.product;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/**
 * Фільтри списку (B-11): пошук за назвою або брендом, категорії, стан терміну, статус.
 * Порожні множини означають «без обмеження».
 */
public record ProductFilter(UUID householdId, String query, Set<ProductCategory> categories,
		Set<Freshness> freshness, ProductStatus status) {

	public ProductFilter {
		query = query == null || query.isBlank() ? null : query.strip();
		categories = categories == null ? Set.of() : Set.copyOf(categories);
		freshness = freshness == null ? Set.of() : Set.copyOf(freshness);
		status = status == null ? ProductStatus.ACTIVE : status;
	}

	public Specification<Product> toSpecification(LocalDate today) {
		return (root, cq, cb) -> cb.and(predicates(root, cb, today, true).toArray(Predicate[]::new));
	}

	/** {@code withCategory = false} — для лічильників на чіпах категорій: усі інші фільтри діють. */
	List<Predicate> predicates(Root<Product> root, CriteriaBuilder cb, LocalDate today, boolean withCategory) {
		List<Predicate> where = new ArrayList<>();
		where.add(cb.equal(root.get("household").get("id"), householdId));
		where.add(cb.equal(root.get("status"), status));
		if (query != null) {
			String pattern = "%" + escapeLike(query.toLowerCase(Locale.ROOT)) + "%";
			where.add(cb.or(cb.like(cb.lower(root.get("name")), pattern, '\\'),
					cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), pattern, '\\')));
		}
		if (withCategory && !categories.isEmpty()) {
			where.add(root.get("category").in(categories));
		}
		if (!freshness.isEmpty()) {
			Path<LocalDate> expiry = root.get("effectiveExpiresAt");
			where.add(cb.or(freshness.stream().map(f -> freshnessPredicate(cb, expiry, f, today)).toArray(Predicate[]::new)));
		}
		return where;
	}

	static Predicate freshnessPredicate(CriteriaBuilder cb, Path<LocalDate> expiry, Freshness freshness, LocalDate today) {
		LocalDate soonEnd = today.plusDays(Freshness.SOON_MAX_DAYS);
		return switch (freshness) {
			case EXPIRED -> cb.lessThan(expiry, today);
			case TODAY -> cb.equal(expiry, today);
			case SOON -> cb.between(expiry, today.plusDays(1), soonEnd);
			case FRESH -> cb.greaterThan(expiry, soonEnd);
		};
	}

	/** Користувач шукає «50%» буквально, а не як шаблон LIKE. */
	static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
