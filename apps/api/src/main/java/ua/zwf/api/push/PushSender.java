package ua.zwf.api.push;

/** Доставка одного push-повідомлення на одну підписку. */
public interface PushSender {

	enum Result {

		DELIVERED,
		/** Підписки більше немає (404 / 410 від push-сервісу) — її треба видалити. */
		GONE,
		FAILED

	}

	Result send(PushSubscription subscription, String payload);

}
