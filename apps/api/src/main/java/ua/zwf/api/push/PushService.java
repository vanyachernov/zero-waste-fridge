package ua.zwf.api.push;

import java.time.Clock;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.notification.Notification;
import ua.zwf.api.notification.NotificationSettingsService;
import ua.zwf.api.notification.NotificationsCreated;

/**
 * B-33: Web Push. Підписки браузерів користувача + доставка нових нагадувань тим, у кого увімкнено push
 * і зараз не тиха година. Корисне навантаження — дані, а не текст: Service Worker складає текст сам (F-72).
 */
@Service
public class PushService {

	public record PublicKey(String publicKey) {
	}

	public record SubscriptionRequest(String endpoint, Keys keys) {

		public record Keys(String p256dh, String auth) {
		}

	}

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private final PushSubscriptionRepository subscriptions;

	private final PushSender sender;

	private final PushProperties properties;

	private final NotificationSettingsService settings;

	private final Today today;

	private final Clock clock;

	public PushService(PushSubscriptionRepository subscriptions, PushSender sender, PushProperties properties,
			NotificationSettingsService settings, Today today, Clock clock) {
		this.subscriptions = subscriptions;
		this.sender = sender;
		this.properties = properties;
		this.settings = settings;
		this.today = today;
		this.clock = clock;
	}

	/** {@code null} — push на сервері вимкнено, фронтенд ховає перемикач. */
	public PublicKey publicKey() {
		return new PublicKey(properties.enabled() ? properties.publicKey() : null);
	}

	@Transactional
	public void subscribe(UUID userId, SubscriptionRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		String endpoint = request == null ? null : request.endpoint();
		if (endpoint == null || !endpoint.startsWith("https://") || endpoint.length() > 1024) {
			errors.put("endpoint", endpoint == null ? "NotNull" : "INVALID");
		}
		var keys = request == null ? null : request.keys();
		if (keys == null || keys.p256dh() == null || keys.p256dh().isBlank()) {
			errors.put("keys.p256dh", "NotBlank");
		}
		if (keys == null || keys.auth() == null || keys.auth().isBlank()) {
			errors.put("keys.auth", "NotBlank");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		subscriptions.findByEndpoint(endpoint)
			.ifPresentOrElse(existing -> existing.reassign(userId, keys.p256dh(), keys.auth()),
					() -> subscriptions.save(new PushSubscription(userId, endpoint, keys.p256dh(), keys.auth(), clock.instant())));
	}

	@Transactional
	public void unsubscribe(UUID userId, String endpoint) {
		if (endpoint != null) {
			subscriptions.deleteByEndpointAndUserId(endpoint, userId);
		}
	}

	/** Після коміту нагадувань (B-31): кожному користувачу з push — по повідомленню на кожну його підписку. */
	@TransactionalEventListener
	@Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
	public void onNotifications(NotificationsCreated event) {
		List<UUID> userIds = event.userIds();
		if (userIds.isEmpty()) {
			return;
		}
		int hour = ZonedDateTime.now(clock.withZone(today.zone())).getHour();
		var byUser = settings.of(userIds);
		var targets = userIds.stream().filter(id -> byUser.get(id).isPush() && !byUser.get(id).isQuiet(hour)).toList();
		if (targets.isEmpty()) {
			return;
		}
		for (PushSubscription subscription : subscriptions.findByUserIdIn(targets)) {
			for (Notification n : event.notifications()) {
				if (!n.getUserId().equals(subscription.getUserId())) {
					continue;
				}
				if (sender.send(subscription, payload(n)) == PushSender.Result.GONE) {
					subscriptions.delete(subscription);
					break;
				}
			}
		}
	}

	static String payload(Notification n) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("id", n.getId());
		data.put("type", n.getType().name());
		data.put("productId", n.getProductId());
		data.put("productName", n.getProductName());
		data.put("daysLeft", n.getDaysLeft());
		data.put("url", "/lms/");
		return JSON.writeValueAsString(data);
	}

}
