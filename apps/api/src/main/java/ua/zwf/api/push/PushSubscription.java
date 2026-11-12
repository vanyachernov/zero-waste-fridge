package ua.zwf.api.push;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "push_subscription")
public class PushSubscription {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, length = 1024, unique = true)
	private String endpoint;

	@Column(nullable = false)
	private String p256dh;

	@Column(nullable = false)
	private String auth;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected PushSubscription() {
	}

	public PushSubscription(UUID userId, String endpoint, String p256dh, String auth, Instant now) {
		this.userId = userId;
		this.endpoint = endpoint;
		this.p256dh = p256dh;
		this.auth = auth;
		this.createdAt = now.truncatedTo(ChronoUnit.MICROS);
	}

	/** Той самий браузер перепідписався (новий акаунт на пристрої або оновлені ключі). */
	public void reassign(UUID userId, String p256dh, String auth) {
		this.userId = userId;
		this.p256dh = p256dh;
		this.auth = auth;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public String getP256dh() {
		return p256dh;
	}

	public String getAuth() {
		return auth;
	}

}
