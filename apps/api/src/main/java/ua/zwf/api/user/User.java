package ua.zwf.api.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(nullable = false, length = 80)
	private String name;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(name = "avatar_url", length = 512)
	private String avatarUrl;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected User() {
	}

	/** @param email вже нормалізований ({@link ua.zwf.api.auth.Emails#normalize}) */
	public User(String email, String name, String passwordHash, Instant now) {
		this.email = Objects.requireNonNull(email);
		this.name = Objects.requireNonNull(name);
		this.passwordHash = Objects.requireNonNull(passwordHash);
		this.createdAt = now;
		this.updatedAt = now;
	}

	public void changePassword(String newPasswordHash, Instant now) {
		this.passwordHash = Objects.requireNonNull(newPasswordHash);
		this.updatedAt = now;
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getName() {
		return name;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getAvatarUrl() {
		return avatarUrl;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
