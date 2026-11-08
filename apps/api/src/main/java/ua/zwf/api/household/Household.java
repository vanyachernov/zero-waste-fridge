package ua.zwf.api.household;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Домогосподарство — спільний холодильник і список покупок для учасників (див. «Моя сім'я»). */
@Entity
@Table(name = "household")
public class Household {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Household() {
	}

	public Household(String name, Instant now) {
		this.name = Objects.requireNonNull(name);
		this.createdAt = now;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
