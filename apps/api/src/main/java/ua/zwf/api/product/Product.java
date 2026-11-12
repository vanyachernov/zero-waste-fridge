package ua.zwf.api.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.household.Household;
import ua.zwf.api.user.User;

/**
 * Продукт у спільному холодильнику домогосподарства (B-10).
 *
 * <p>Дати — календарні ({@link LocalDate}): «придатний до» на упаковці не має часу. {@code effectiveExpiresAt}
 * зберігається, а не обчислюється в запиті, щоб за ним працювали індекс і сортування «спочатку критичні».
 */
@Entity
@Table(name = "product")
public class Product {

	public static final int NAME_MAX = 120;

	public static final int BRAND_MAX = 120;

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false, updatable = false)
	private Household household;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "added_by", updatable = false)
	private User addedBy;

	@Column(nullable = false, length = NAME_MAX)
	private String name;

	@Column(length = BRAND_MAX)
	private String brand;

	@Column(nullable = false, length = 16)
	private ProductCategory category;

	@Column(nullable = false, length = 16)
	private StorageZone zone;

	@Column(nullable = false, precision = 10, scale = 3)
	private BigDecimal quantity;

	@Column(nullable = false, length = 8)
	private Unit unit;

	@Column(name = "purchased_at")
	private LocalDate purchasedAt;

	@Column(name = "expires_at", nullable = false)
	private LocalDate expiresAt;

	@Column(name = "opened_at")
	private LocalDate openedAt;

	@Column(name = "opened_shelf_life_days")
	private Short openedShelfLifeDays;

	@Column(name = "effective_expires_at", nullable = false)
	private LocalDate effectiveExpiresAt;

	@Column(name = "reminder_sent_for")
	private LocalDate reminderSentFor;

	@Column(name = "remind_before_days", nullable = false)
	private short remindBeforeDays;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private ProductStatus status;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "closed_at")
	private Instant closedAt;

	protected Product() {
	}

	public Product(Household household, User addedBy, ProductDetails details, Instant now) {
		this.household = Objects.requireNonNull(household);
		this.addedBy = addedBy;
		this.status = ProductStatus.ACTIVE;
		this.createdAt = db(now);
		apply(details, now);
	}

	/** Замінює редаговані поля (створення і PATCH). Інваріанти перевіряє {@link ProductDetails}. */
	public void apply(ProductDetails details, Instant now) {
		Objects.requireNonNull(details);
		this.name = details.name();
		this.brand = details.brand();
		this.category = details.category();
		this.zone = details.zone();
		this.quantity = details.quantity();
		this.unit = details.unit();
		this.purchasedAt = details.purchasedAt();
		this.expiresAt = details.expiresAt();
		this.remindBeforeDays = (short) details.remindBeforeDays();
		if (openedAt != null && purchasedAt != null && openedAt.isBefore(purchasedAt)) {
			throw new IllegalArgumentException("openedAt must not be before purchasedAt");
		}
		recalculateEffectiveExpiry();
		this.updatedAt = db(now);
	}

	/**
	 * B-12: упаковку відкрито. Термін скорочується до {@code min(expiresAt, openedAt + shelfLifeDays)};
	 * якщо на упаковці дата раніша — лишається вона.
	 */
	public void open(LocalDate openedAt, int shelfLifeDays, Instant now) {
		Objects.requireNonNull(openedAt, "openedAt");
		if (shelfLifeDays < 1 || shelfLifeDays > 365) {
			throw new IllegalArgumentException("shelfLifeDays must be 1..365");
		}
		if (purchasedAt != null && openedAt.isBefore(purchasedAt)) {
			throw new IllegalArgumentException("openedAt must not be before purchasedAt");
		}
		this.openedAt = openedAt;
		this.openedShelfLifeDays = (short) shelfLifeDays;
		recalculateEffectiveExpiry();
		this.updatedAt = db(now);
	}

	/** Позначку «відкрито» знято (помилково поставили) — знову діє дата з упаковки. */
	public void unopen(Instant now) {
		this.openedAt = null;
		this.openedShelfLifeDays = null;
		recalculateEffectiveExpiry();
		this.updatedAt = db(now);
	}

	/**
	 * B-13: списати {@code amount} (або все, якщо {@code null}). Повертає списану кількість. Коли нічого не
	 * лишилось, продукт закривається зі статусом за результатом (викинуто → WASTED, інакше CONSUMED).
	 */
	public BigDecimal writeOff(WriteOffOutcome outcome, BigDecimal amount, Instant now) {
		Objects.requireNonNull(outcome, "outcome");
		if (!isActive()) {
			throw new IllegalStateException("Product is already closed");
		}
		BigDecimal written = amount == null ? quantity : amount;
		if (written.signum() <= 0 || written.compareTo(quantity) > 0) {
			throw new IllegalArgumentException("amount must be in (0, quantity]");
		}
		BigDecimal remaining = quantity.subtract(written);
		if (remaining.signum() == 0) {
			this.status = outcome.closingStatus();
			this.closedAt = db(now);
		}
		else {
			this.quantity = remaining;
		}
		this.updatedAt = db(now);
		return written;
	}

	/** B-31: нагадування про поточний термін надіслано. */
	public void markReminded() {
		this.reminderSentFor = effectiveExpiresAt;
	}

	public LocalDate getReminderSentFor() {
		return reminderSentFor;
	}

	public boolean isOpened() {
		return openedAt != null;
	}

	/**
	 * PostgreSQL {@code TIMESTAMPTZ} зберігає мікросекунди: обрізаємо одразу, щоб відповідь на POST
	 * збігалася з тим, що потім поверне GET.
	 */
	static Instant db(Instant instant) {
		return instant == null ? null : instant.truncatedTo(ChronoUnit.MICROS);
	}

	private void recalculateEffectiveExpiry() {
		LocalDate effective = expiresAt;
		if (openedAt != null) {
			LocalDate afterOpening = openedAt.plusDays(openedShelfLifeDays);
			if (afterOpening.isBefore(effective)) {
				effective = afterOpening;
			}
		}
		this.effectiveExpiresAt = effective;
	}

	public ProductDetails details() {
		return new ProductDetails(name, brand, category, zone, quantity, unit, purchasedAt, expiresAt, remindBeforeDays);
	}

	public boolean isActive() {
		return status == ProductStatus.ACTIVE;
	}

	public UUID getId() {
		return id;
	}

	public Household getHousehold() {
		return household;
	}

	public User getAddedBy() {
		return addedBy;
	}

	public String getName() {
		return name;
	}

	public String getBrand() {
		return brand;
	}

	public ProductCategory getCategory() {
		return category;
	}

	public StorageZone getZone() {
		return zone;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public Unit getUnit() {
		return unit;
	}

	public LocalDate getPurchasedAt() {
		return purchasedAt;
	}

	public LocalDate getExpiresAt() {
		return expiresAt;
	}

	public LocalDate getOpenedAt() {
		return openedAt;
	}

	public Integer getOpenedShelfLifeDays() {
		return openedShelfLifeDays == null ? null : openedShelfLifeDays.intValue();
	}

	public LocalDate getEffectiveExpiresAt() {
		return effectiveExpiresAt;
	}

	public int getRemindBeforeDays() {
		return remindBeforeDays;
	}

	public ProductStatus getStatus() {
		return status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public Instant getClosedAt() {
		return closedAt;
	}

}
