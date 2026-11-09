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
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.household.Household;
import ua.zwf.api.user.User;

/** Подія в житті продукту: хто, що і коли зробив (B-13, далі B-24 і B-53). */
@Entity
@Table(name = "product_event")
public class ProductEvent {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false, updatable = false)
	private Household household;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "product_id", nullable = false, updatable = false)
	private Product product;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "actor_id", updatable = false)
	private User actor;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16, updatable = false)
	private ProductEventType type;

	@Enumerated(EnumType.STRING)
	@Column(length = 16, updatable = false)
	private WriteOffOutcome outcome;

	@Column(precision = 10, scale = 3, updatable = false)
	private BigDecimal quantity;

	@Column(length = 8, updatable = false)
	private Unit unit;

	@Column(name = "occurred_at", nullable = false, updatable = false)
	private Instant occurredAt;

	protected ProductEvent() {
	}

	private ProductEvent(Product product, User actor, ProductEventType type, WriteOffOutcome outcome,
			BigDecimal quantity, Instant now) {
		this.product = Objects.requireNonNull(product);
		this.household = product.getHousehold();
		this.actor = actor;
		this.type = type;
		this.outcome = outcome;
		this.quantity = quantity;
		this.unit = quantity == null ? null : product.getUnit();
		this.occurredAt = Product.db(now);
	}

	public static ProductEvent of(Product product, User actor, ProductEventType type, Instant now) {
		if (type == ProductEventType.WRITTEN_OFF) {
			throw new IllegalArgumentException("Use writtenOff() for write-offs");
		}
		return new ProductEvent(product, actor, type, null, null, now);
	}

	public static ProductEvent writtenOff(Product product, User actor, WriteOffOutcome outcome, BigDecimal quantity,
			Instant now) {
		return new ProductEvent(product, actor, ProductEventType.WRITTEN_OFF, Objects.requireNonNull(outcome),
				Objects.requireNonNull(quantity), now);
	}

	public UUID getId() {
		return id;
	}

	public Product getProduct() {
		return product;
	}

	public User getActor() {
		return actor;
	}

	public ProductEventType getType() {
		return type;
	}

	public WriteOffOutcome getOutcome() {
		return outcome;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public Unit getUnit() {
		return unit;
	}

	public Instant getOccurredAt() {
		return occurredAt;
	}

}
