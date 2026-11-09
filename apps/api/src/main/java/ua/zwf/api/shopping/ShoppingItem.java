package ua.zwf.api.shopping;

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
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.household.Household;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;
import ua.zwf.api.user.User;

/** Позиція спільного списку покупок (B-40). Куплена — та, що має {@code boughtAt}. */
@Entity
@Table(name = "shopping_item")
public class ShoppingItem {

	public static final int NAME_MAX = 120;

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false, updatable = false)
	private Household household;

	@Column(nullable = false, length = NAME_MAX)
	private String name;

	@Column(precision = 10, scale = 3)
	private BigDecimal quantity;

	@Column(length = 8)
	private Unit unit;

	@Column(length = 16)
	private ProductCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 8)
	private ShoppingPriority priority;

	@Column(name = "price_estimate", precision = 10, scale = 2)
	private BigDecimal priceEstimate;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "store_id")
	private Store store;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16, updatable = false)
	private ShoppingSource source;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "source_product_id", updatable = false)
	private Product sourceProduct;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "added_by", updatable = false)
	private User addedBy;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "bought_at")
	private Instant boughtAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "bought_by")
	private User boughtBy;

	protected ShoppingItem() {
	}

	public ShoppingItem(Household household, User addedBy, ShoppingSource source, Product sourceProduct,
			ShoppingItemDetails details, Instant now) {
		this.household = Objects.requireNonNull(household);
		this.addedBy = addedBy;
		this.source = Objects.requireNonNull(source);
		this.sourceProduct = sourceProduct;
		this.createdAt = db(now);
		apply(details, now);
	}

	public void apply(ShoppingItemDetails details, Instant now) {
		this.name = details.name();
		this.quantity = details.quantity();
		this.unit = details.unit();
		this.category = details.category();
		this.priority = details.priority();
		this.priceEstimate = details.priceEstimate();
		this.updatedAt = db(now);
	}

	public ShoppingItemDetails details() {
		return new ShoppingItemDetails(name, quantity, unit, category, priority, priceEstimate);
	}

	public void moveTo(Store store, Instant now) {
		this.store = store;
		this.updatedAt = db(now);
	}

	/** «Куплено» ↔ «треба купити». */
	public void toggle(User by, Instant now) {
		if (isBought()) {
			this.boughtAt = null;
			this.boughtBy = null;
		}
		else {
			this.boughtAt = db(now);
			this.boughtBy = by;
		}
		this.updatedAt = db(now);
	}

	public boolean isBought() {
		return boughtAt != null;
	}

	/** TIMESTAMPTZ зберігає мікросекунди — як і в {@link Product}. */
	static Instant db(Instant instant) {
		return instant == null ? null : instant.truncatedTo(ChronoUnit.MICROS);
	}

	public UUID getId() {
		return id;
	}

	public Household getHousehold() {
		return household;
	}

	public String getName() {
		return name;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public Unit getUnit() {
		return unit;
	}

	public ProductCategory getCategory() {
		return category;
	}

	public ShoppingPriority getPriority() {
		return priority;
	}

	public BigDecimal getPriceEstimate() {
		return priceEstimate;
	}

	public Store getStore() {
		return store;
	}

	public ShoppingSource getSource() {
		return source;
	}

	public Product getSourceProduct() {
		return sourceProduct;
	}

	public User getAddedBy() {
		return addedBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public Instant getBoughtAt() {
		return boughtAt;
	}

	public User getBoughtBy() {
		return boughtBy;
	}

}
