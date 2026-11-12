package ua.zwf.api.support;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import ua.zwf.api.push.PushSender;
import ua.zwf.api.push.PushSubscription;

/** Замість справжніх push-сервісів: запам'ятовує повідомлення; відповідь можна підмінити (напр. GONE). */
public class RecordingPushSender implements PushSender {

	public record Sent(String endpoint, String payload) {
	}

	private final List<Sent> sent = new CopyOnWriteArrayList<>();

	private volatile Result result = Result.DELIVERED;

	@Override
	public Result send(PushSubscription subscription, String payload) {
		sent.add(new Sent(subscription.getEndpoint(), payload));
		return result;
	}

	public List<Sent> sentTo(String endpoint) {
		return sent.stream().filter(s -> s.endpoint().equals(endpoint)).toList();
	}

	public void answer(Result next) {
		this.result = next;
	}

}
