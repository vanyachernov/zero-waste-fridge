package ua.zwf.api.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class NotificationTest {

	@Test
	void markReadKeepsTheFirstTimeAndResponseCarriesProduct() {
		var n = new Notification(UUID.randomUUID(), UUID.randomUUID(), NotificationType.EXPIRY_REMINDER, UUID.randomUUID(),
				"Йогурт", 1, Instant.parse("2026-11-09T10:00:00.123456789Z"));

		assertThat(n.getCreatedAt()).isEqualTo(Instant.parse("2026-11-09T10:00:00.123456Z"));
		n.markRead(Instant.parse("2026-11-09T11:00:00Z"));
		n.markRead(Instant.parse("2026-11-09T12:00:00Z"));
		assertThat(n.getReadAt()).isEqualTo(Instant.parse("2026-11-09T11:00:00Z"));

		var response = NotificationResponse.of(n);
		assertThat(response.read()).isTrue();
		assertThat(response.product().name()).isEqualTo("Йогурт");
		assertThat(response.daysLeft()).isEqualTo(1);
	}

	@Test
	void productIsNullWhenThereIsNoProduct() {
		var n = new Notification(UUID.randomUUID(), UUID.randomUUID(), NotificationType.EXPIRY_REMINDER, null, null, null,
				Instant.EPOCH);

		assertThat(NotificationResponse.of(n).product()).isNull();
	}

}
