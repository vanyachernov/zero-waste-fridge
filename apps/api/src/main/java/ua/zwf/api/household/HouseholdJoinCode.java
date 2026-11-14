package ua.zwf.api.household;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/** Код сім'ї «ZWF-XXXX-XX» (B-52): один на домогосподарство, багаторазовий до кінця терміну, роль — MEMBER. */
@Entity
@Table(name = "household_join_code")
public class HouseholdJoinCode {

	@Id
	@Column(name = "household_id")
	private UUID householdId;

	@Column(nullable = false, length = 12)
	private String code;

	@Column(name = "created_by")
	private UUID createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	protected HouseholdJoinCode() {
	}

	public HouseholdJoinCode(UUID householdId) {
		this.householdId = householdId;
	}

	public void regenerate(String code, UUID by, Instant now, Instant expiresAt) {
		this.code = code;
		this.createdBy = by;
		this.createdAt = now.truncatedTo(ChronoUnit.MICROS);
		this.expiresAt = expiresAt.truncatedTo(ChronoUnit.MICROS);
	}

	public boolean isValid(Instant now) {
		return now.isBefore(expiresAt);
	}

	public UUID getHouseholdId() {
		return householdId;
	}

	public String getCode() {
		return code;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

}
