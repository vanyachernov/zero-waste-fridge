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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import ua.zwf.api.user.User;

@Entity
@Table(name = "household_member")
public class Membership {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "household_id", nullable = false)
	private Household household;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private HouseholdRole role;

	@Column(name = "joined_at", nullable = false)
	private Instant joinedAt;

	protected Membership() {
	}

	public Membership(Household household, User user, HouseholdRole role, Instant now) {
		this.household = Objects.requireNonNull(household);
		this.user = Objects.requireNonNull(user);
		this.role = Objects.requireNonNull(role);
		this.joinedAt = now;
	}

	public void changeRole(HouseholdRole role) {
		this.role = Objects.requireNonNull(role);
	}

	/** Перехід в інше домогосподарство (вступ за запрошенням, видалення з сім'ї). */
	public void moveTo(Household household, HouseholdRole role, Instant now) {
		this.household = Objects.requireNonNull(household);
		this.role = Objects.requireNonNull(role);
		this.joinedAt = now;
	}

	public UUID getId() {
		return id;
	}

	public Household getHousehold() {
		return household;
	}

	public User getUser() {
		return user;
	}

	public HouseholdRole getRole() {
		return role;
	}

	public Instant getJoinedAt() {
		return joinedAt;
	}

}
