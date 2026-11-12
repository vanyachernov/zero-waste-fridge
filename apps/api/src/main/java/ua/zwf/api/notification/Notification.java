package ua.zwf.api.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

/**
 * Сповіщення користувача (B-32). Посилання на користувача, домогосподарство й продукт — простими id:
 * сповіщення лише читаються й позначаються прочитаними, асоціації тут не потрібні.
 */
@Entity
@Table(name = "notification")
public class Notification {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Column(name = "household_id", nullable = false, updatable = false)
	private UUID householdId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32, updatable = false)
	private NotificationType type;

	@Column(name = "product_id", updatable = false)
	private UUID productId;

	@Column(name = "product_name", length = 120, updatable = false)
	private String productName;

	@Column(name = "days_left", updatable = false)
	private Integer daysLeft;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "read_at")
	private Instant readAt;

	protected Notification() {
	}

	public Notification(UUID userId, UUID householdId, NotificationType type, UUID productId, String productName,
			Integer daysLeft, Instant now) {
		this.userId = Objects.requireNonNull(userId);
		this.householdId = Objects.requireNonNull(householdId);
		this.type = Objects.requireNonNull(type);
		this.productId = productId;
		this.productName = productName;
		this.daysLeft = daysLeft;
		this.createdAt = now.truncatedTo(ChronoUnit.MICROS);
	}

	public void markRead(Instant now) {
		if (readAt == null) {
			this.readAt = now.truncatedTo(ChronoUnit.MICROS);
		}
	}

	public boolean isRead() {
		return readAt != null;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getHouseholdId() {
		return householdId;
	}

	public NotificationType getType() {
		return type;
	}

	public UUID getProductId() {
		return productId;
	}

	public String getProductName() {
		return productName;
	}

	public Integer getDaysLeft() {
		return daysLeft;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getReadAt() {
		return readAt;
	}

}
