package ua.zwf.api.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Продукт у відповідях API. {@code daysLeft} і {@code freshness} рахуються від «сьогодні» в поясі
 * користувачів ({@link ua.zwf.api.common.Today}), щоб усі клієнти показували однаковий бейдж.
 */
public record ProductResponse(UUID id, String name, String brand, ProductCategory category, StorageZone zone,
		BigDecimal quantity, Unit unit, LocalDate purchasedAt, LocalDate expiresAt, LocalDate openedAt,
		Integer openedShelfLifeDays, LocalDate effectiveExpiresAt, long daysLeft, Freshness freshness,
		int remindBeforeDays, ProductStatus status, Author addedBy, Instant createdAt, Instant updatedAt) {

	/** Хто додав — для «Додано Максимом» (B-53). {@code null}, якщо акаунт видалено. */
	public record Author(UUID id, String name) {
	}

	public static ProductResponse of(Product p, LocalDate today) {
		long daysLeft = ChronoUnit.DAYS.between(today, p.getEffectiveExpiresAt());
		var author = p.getAddedBy() == null ? null : new Author(p.getAddedBy().getId(), p.getAddedBy().getName());
		return new ProductResponse(p.getId(), p.getName(), p.getBrand(), p.getCategory(), p.getZone(),
				plain(p.getQuantity()), p.getUnit(), p.getPurchasedAt(), p.getExpiresAt(), p.getOpenedAt(),
				p.getOpenedShelfLifeDays(), p.getEffectiveExpiresAt(), daysLeft, Freshness.of(daysLeft),
				p.getRemindBeforeDays(), p.getStatus(), author, p.getCreatedAt(), p.getUpdatedAt());
	}

	/** {@code 350.000} → {@code 350}, {@code 1.500} → {@code 1.5} (без експоненти на кшталт {@code 3.5E+2}). */
	static BigDecimal plain(BigDecimal value) {
		BigDecimal stripped = value.stripTrailingZeros();
		return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
	}

}
