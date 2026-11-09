package ua.zwf.api.shopping;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.household.Household;

/** Магазин домогосподарства (B-44): фільтр «Всі / Сільпо / …» і «Максим зараз у „Сільпо“». */
@Entity
@Table(name = "store")
public class Store {

	public static final int NAME_MAX = 60;

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false, updatable = false)
	private Household household;

	@Column(nullable = false, length = NAME_MAX)
	private String name;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected Store() {
	}

	public Store(Household household, String name, Instant now) {
		this.household = Objects.requireNonNull(household);
		this.name = Objects.requireNonNull(name);
		this.createdAt = ShoppingItem.db(now);
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

	public Instant getCreatedAt() {
		return createdAt;
	}

}
