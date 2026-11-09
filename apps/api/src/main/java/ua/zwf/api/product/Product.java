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

	@Column(name = "effective_expires_at", nullable = false)
	private LocalDate effectiveExpiresAt;

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
		this.createdAt = now;
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
		this.effectiveExpiresAt = details.expiresAt();
		this.updatedAt = now;
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
