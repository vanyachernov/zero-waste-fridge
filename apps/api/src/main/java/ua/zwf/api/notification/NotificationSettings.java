package ua.zwf.api.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/** Налаштування сповіщень користувача (B-34). */
@Entity
@Table(name = "notification_settings")
public class NotificationSettings {

	public static final int DEFAULT_DIGEST_HOUR = 8;

	@Id
	@Column(name = "user_id")
	private UUID userId;

	@Column(name = "in_app", nullable = false)
	private boolean inApp;

	@Column(name = "email_digest", nullable = false)
	private boolean emailDigest;

	@Column(nullable = false)
	private boolean push;

	@Column(name = "digest_hour", nullable = false)
	private short digestHour;

	@Column(name = "quiet_from")
	private Short quietFrom;

	@Column(name = "quiet_to")
	private Short quietTo;

	@Column(name = "digest_sent_on")
	private LocalDate digestSentOn;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected NotificationSettings() {
	}

	/** Значення за замовчуванням, поки користувач нічого не змінював. */
	public static NotificationSettings defaults(UUID userId) {
		var settings = new NotificationSettings();
		settings.userId = userId;
		settings.inApp = true;
		settings.emailDigest = true;
		settings.push = false;
		settings.digestHour = DEFAULT_DIGEST_HOUR;
		settings.updatedAt = Instant.EPOCH;
		return settings;
	}

	public void update(boolean inApp, boolean emailDigest, boolean push, int digestHour, Integer quietFrom,
			Integer quietTo, Instant now) {
		this.inApp = inApp;
		this.emailDigest = emailDigest;
		this.push = push;
		this.digestHour = (short) digestHour;
		this.quietFrom = quietFrom == null ? null : quietFrom.shortValue();
		this.quietTo = quietTo == null ? null : quietTo.shortValue();
		this.updatedAt = now.truncatedTo(ChronoUnit.MICROS);
	}

	/**
	 * Тиха година: {@code from..to} без кінця, через північ теж ({@code 22..7} — з 22:00 до 06:59).
	 */
	public boolean isQuiet(int hour) {
		if (quietFrom == null || quietTo == null) {
			return false;
		}
		return quietFrom < quietTo ? hour >= quietFrom && hour < quietTo : hour >= quietFrom || hour < quietTo;
	}

	/** Хоч якийсь канал для нагадувань (дзвіночок або push). */
	public boolean wantsReminders() {
		return inApp || push;
	}

	public void markDigestSent(LocalDate date) {
		this.digestSentOn = date;
	}

	public UUID getUserId() {
		return userId;
	}

	public boolean isInApp() {
		return inApp;
	}

	public boolean isEmailDigest() {
		return emailDigest;
	}

	public boolean isPush() {
		return push;
	}

	public int getDigestHour() {
		return digestHour;
	}

	public Integer getQuietFrom() {
		return quietFrom == null ? null : quietFrom.intValue();
	}

	public Integer getQuietTo() {
		return quietTo == null ? null : quietTo.intValue();
	}

	public LocalDate getDigestSentOn() {
		return digestSentOn;
	}

}
