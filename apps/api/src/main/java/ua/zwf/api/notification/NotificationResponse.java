package ua.zwf.api.notification;

import java.time.Instant;
import java.util.UUID;

/** Сповіщення в дзвіночку. {@code product} — куди веде клік; {@code null}, якщо продукту вже немає. */
public record NotificationResponse(UUID id, NotificationType type, Instant createdAt, boolean read, ProductRef product,
		Integer daysLeft) {

	public record ProductRef(UUID id, String name) {
	}

	static NotificationResponse of(Notification n) {
		var product = n.getProductName() == null ? null : new ProductRef(n.getProductId(), n.getProductName());
		return new NotificationResponse(n.getId(), n.getType(), n.getCreatedAt(), n.isRead(), product, n.getDaysLeft());
	}

}
