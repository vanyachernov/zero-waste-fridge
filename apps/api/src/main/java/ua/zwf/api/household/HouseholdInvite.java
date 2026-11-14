package ua.zwf.api.household;

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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.user.User;

/** Запрошення листом (B-52): діє для конкретного email, одноразове, з терміном. */
@Entity
@Table(name = "household_invite")
public class HouseholdInvite {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false, updatable = false)
	private Household household;

	@Column(nullable = false, length = 254, updatable = false)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16, updatable = false)
	private HouseholdRole role;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "invited_by", updatable = false)
	private User invitedBy;

	@Column(name = "token_hash", nullable = false, length = 64, updatable = false)
	private String tokenHash;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "expires_at", nullable = false, updatable = false)
	private Instant expiresAt;

	@Column(name = "accepted_at")
	private Instant acceptedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "accepted_by")
	private User acceptedBy;

	protected HouseholdInvite() {
	}

	public HouseholdInvite(Household household, String email, HouseholdRole role, User invitedBy, String tokenHash,
			Instant now, Instant expiresAt) {
		this.household = Objects.requireNonNull(household);
		this.email = Objects.requireNonNull(email);
		this.role = Objects.requireNonNull(role);
		this.invitedBy = invitedBy;
		this.tokenHash = Objects.requireNonNull(tokenHash);
		this.createdAt = now.truncatedTo(ChronoUnit.MICROS);
		this.expiresAt = expiresAt.truncatedTo(ChronoUnit.MICROS);
	}

	public boolean isOpen(Instant now) {
		return acceptedAt == null && now.isBefore(expiresAt);
	}

	public void accept(User by, Instant now) {
		this.acceptedAt = now.truncatedTo(ChronoUnit.MICROS);
		this.acceptedBy = by;
	}

	public UUID getId() {
		return id;
	}

	public Household getHousehold() {
		return household;
	}

	public String getEmail() {
		return email;
	}

	public HouseholdRole getRole() {
		return role;
	}

	public User getInvitedBy() {
		return invitedBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

	public Instant getAcceptedAt() {
		return acceptedAt;
	}

}
