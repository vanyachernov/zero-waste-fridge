package ua.zwf.api.product;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Редаговані поля продукту з уже нормалізованими значеннями. Конструктор відкидає те, що заборонено
 * і в БД (CHECK у {@code V4__product.sql}), щоб помилка виникала в домені, а не на {@code flush}.
 */
public record ProductDetails(String name, String brand, ProductCategory category, StorageZone zone,
		BigDecimal quantity, Unit unit, LocalDate purchasedAt, LocalDate expiresAt, int remindBeforeDays) {

	public ProductDetails {
		name = collapse(Objects.requireNonNull(name, "name"));
		if (name.isEmpty() || name.length() > Product.NAME_MAX) {
			throw new IllegalArgumentException("name must be 1.." + Product.NAME_MAX + " characters");
		}
		brand = brand == null ? null : collapse(brand);
		if (brand != null && brand.isEmpty()) {
			brand = null;
		}
		if (brand != null && brand.length() > Product.BRAND_MAX) {
			throw new IllegalArgumentException("brand must be at most " + Product.BRAND_MAX + " characters");
		}
		Objects.requireNonNull(category, "category");
		Objects.requireNonNull(zone, "zone");
		Objects.requireNonNull(unit, "unit");
		Objects.requireNonNull(expiresAt, "expiresAt");
		Objects.requireNonNull(quantity, "quantity");
		if (quantity.signum() <= 0) {
			throw new IllegalArgumentException("quantity must be positive");
		}
		if (!ReminderLead.isAllowed(remindBeforeDays)) {
			throw new IllegalArgumentException("remindBeforeDays must be one of " + ReminderLead.ALLOWED_DAYS);
		}
		if (purchasedAt != null && expiresAt.isBefore(purchasedAt)) {
			throw new IllegalArgumentException("expiresAt must not be before purchasedAt");
		}
	}

	/** Та сама кількість у масштабі колонки {@code NUMERIC(10,3)} — для порівняння з тим, що повертає БД. */
	public ProductDetails withQuantityScale(int scale) {
		return new ProductDetails(name, brand, category, zone, quantity.setScale(scale), unit, purchasedAt, expiresAt,
				remindBeforeDays);
	}

	/** Прибирає зайві пробіли: «  Грецький   йогурт » → «Грецький йогурт». */
	static String collapse(String value) {
		return value.strip().replaceAll("\\s+", " ");
	}

}
