package ua.zwf.api.notification;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ApiException;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.CurrentHousehold;

/** B-32: дзвіночок у шапці — список, лічильник, «прочитано», «прочитати всі». */
@Service
public class NotificationService {

	public static final int DEFAULT_LIMIT = 20;

	public static final int MAX_LIMIT = 100;

	public record Feed(List<NotificationResponse> items, long unread) {
	}

	static class NotFound extends ApiException {

		NotFound() {
			super(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification not found");
		}

	}

	private final NotificationRepository notifications;

	private final CurrentHousehold household;

	private final Clock clock;

	public NotificationService(NotificationRepository notifications, CurrentHousehold household, Clock clock) {
		this.notifications = notifications;
		this.household = household;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public Feed feed(UUID userId, int limit) {
		if (limit < 1 || limit > MAX_LIMIT) {
			throw new ValidationException(Map.of("limit", "Range"));
		}
		UUID householdId = household.idOf(userId);
		var items = notifications.findFeed(userId, householdId, PageRequest.of(0, limit))
			.stream()
			.map(NotificationResponse::of)
			.toList();
		return new Feed(items, notifications.countUnread(userId, householdId));
	}

	@Transactional(readOnly = true)
	public long unread(UUID userId) {
		return notifications.countUnread(userId, household.idOf(userId));
	}

	/** Чуже сповіщення виглядає як неіснуюче. Повторне «прочитано» — без помилки. */
	@Transactional
	public void markRead(UUID userId, UUID notificationId) {
		notifications.findByIdAndUserId(notificationId, userId).orElseThrow(NotFound::new).markRead(clock.instant());
	}

	@Transactional
	public int markAllRead(UUID userId) {
		return notifications.markAllRead(userId, household.idOf(userId), clock.instant());
	}

}
