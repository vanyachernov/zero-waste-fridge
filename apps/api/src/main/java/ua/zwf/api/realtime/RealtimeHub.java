package ua.zwf.api.realtime;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * B-54: відкриті SSE-з'єднання учасників сімей. Події — лише «що змінилось» (тема), дані клієнт
 * перечитує сам: так не треба дублювати права доступу й формат відповідей у потоці.
 *
 * <ul>
 *   <li>{@code changed} — {@code {topic: products | shopping-list | household, actor}};</li>
 *   <li>{@code presence} — хто зараз онлайн і хто в якому магазині;</li>
 *   <li>{@code notifications} — у користувача нові сповіщення (B-31).</li>
 * </ul>
 */
@Component
public class RealtimeHub {

	private static final Logger log = LoggerFactory.getLogger(RealtimeHub.class);

	/** Довше за типові проксі-таймаути не тримаємо — EventSource перепідключиться сам. */
	public static final long TIMEOUT_MS = 30 * 60 * 1000L;

	public record Person(UUID id, String name) {
	}

	public record PresenceEntry(UUID id, String name, String shoppingAt) {
	}

	public record Presence(List<PresenceEntry> online) {
	}

	public record Changed(String topic, Person actor) {
	}

	static final class Connection {

		final UUID householdId;

		final Person user;

		final SseEmitter emitter;

		volatile String shoppingAt;

		Connection(UUID householdId, Person user, SseEmitter emitter) {
			this.householdId = householdId;
			this.user = user;
			this.emitter = emitter;
		}

	}

	private final Map<UUID, Set<Connection>> byHousehold = new ConcurrentHashMap<>();

	public SseEmitter connect(UUID householdId, UUID userId, String name) {
		var emitter = new SseEmitter(TIMEOUT_MS);
		var connection = new Connection(householdId, new Person(userId, name), emitter);
		byHousehold.computeIfAbsent(householdId, id -> new CopyOnWriteArraySet<>()).add(connection);
		Runnable remove = () -> disconnect(connection);
		emitter.onCompletion(remove);
		emitter.onTimeout(remove);
		emitter.onError(error -> remove.run());
		// Одразу кажемо браузеру, з якою затримкою перепідключатись, і хто вже онлайн
		send(connection, SseEmitter.event().reconnectTime(3000).comment("connected"));
		broadcastPresence(householdId);
		return emitter;
	}

	/** Зміни даних сім'ї — усім її з'єднанням (і автору: його інші вкладки теж мають оновитись). */
	public void changed(UUID householdId, String topic, UUID actorId, String actorName) {
		var event = new Changed(topic, actorId == null ? null : new Person(actorId, actorName));
		connections(householdId).forEach(c -> send(c, SseEmitter.event().name("changed").data(event, MediaType.APPLICATION_JSON)));
	}

	public void notifications(UUID userId) {
		byHousehold.values()
			.stream()
			.flatMap(Set::stream)
			.filter(c -> c.user.id().equals(userId))
			.forEach(c -> send(c, SseEmitter.event().name("notifications").data(Map.of("userId", userId), MediaType.APPLICATION_JSON)));
	}

	/** «Максим зараз у «Сільпо»» — для всіх його відкритих вкладок; {@code null} — вийшов із магазину. */
	public void shopping(UUID householdId, UUID userId, String storeName) {
		connections(householdId).stream().filter(c -> c.user.id().equals(userId)).forEach(c -> c.shoppingAt = storeName);
		broadcastPresence(householdId);
	}

	public Presence presence(UUID householdId) {
		Map<UUID, PresenceEntry> unique = new LinkedHashMap<>();
		connections(householdId).stream()
			.sorted(Comparator.comparing((Connection c) -> c.user.name()))
			.forEach(c -> unique.merge(c.user.id(), new PresenceEntry(c.user.id(), c.user.name(), c.shoppingAt),
					(a, b) -> a.shoppingAt() != null ? a : b));
		return new Presence(new ArrayList<>(unique.values()));
	}

	/** Коментар-пінг тримає з'єднання живим і виявляє «мертві» (закрита вкладка без FIN). */
	public void heartbeat() {
		byHousehold.values().forEach(set -> set.forEach(c -> send(c, SseEmitter.event().comment("ping"))));
	}

	public int connectionCount() {
		return byHousehold.values().stream().mapToInt(Set::size).sum();
	}

	private Set<Connection> connections(UUID householdId) {
		return byHousehold.getOrDefault(householdId, Set.of());
	}

	private void broadcastPresence(UUID householdId) {
		var presence = presence(householdId);
		connections(householdId).forEach(c -> send(c, SseEmitter.event().name("presence").data(presence, MediaType.APPLICATION_JSON)));
	}

	private void disconnect(Connection connection) {
		var set = byHousehold.get(connection.householdId);
		if (set != null && set.remove(connection)) {
			if (set.isEmpty()) {
				byHousehold.remove(connection.householdId, set);
			}
			broadcastPresence(connection.householdId);
		}
	}

	private void send(Connection connection, SseEmitter.SseEventBuilder event) {
		try {
			connection.emitter.send(event);
		}
		catch (IOException | IllegalStateException ex) {
			log.debug("SSE connection of {} closed: {}", connection.user.id(), ex.toString());
			connection.emitter.completeWithError(ex);
			disconnect(connection);
		}
	}

}
