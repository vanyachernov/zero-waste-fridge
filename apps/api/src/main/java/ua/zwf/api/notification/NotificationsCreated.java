package ua.zwf.api.notification;

import java.util.List;
import java.util.UUID;

/** Нові сповіщення збережено — для каналів доставки (Web Push, B-33) і реалтайму (B-54). */
public record NotificationsCreated(List<Notification> notifications) {

	public List<UUID> userIds() {
		return notifications.stream().map(Notification::getUserId).distinct().toList();
	}

}
