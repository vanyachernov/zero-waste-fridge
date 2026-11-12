package ua.zwf.api.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Щогодини запускає {@link ReminderService} (на 5-й хвилині) і {@link DigestService} (на початку години). У тестах вимкнено
 * ({@code zwf.reminders.enabled=false}) — там сервіс викликають напряму.
 */
@Component
@ConditionalOnProperty(prefix = "zwf.reminders", name = "enabled", havingValue = "true", matchIfMissing = true)
class ReminderScheduler {

	private final ReminderService reminders;

	private final DigestService digest;

	ReminderScheduler(ReminderService reminders, DigestService digest) {
		this.reminders = reminders;
		this.digest = digest;
	}

	@Scheduled(cron = "${zwf.reminders.cron:0 5 * * * *}", zone = "${zwf.time-zone:Europe/Kyiv}")
	void run() {
		reminders.run();
	}

	/** B-33: на початку кожної години — дайджест тим, хто обрав цю годину. */
	@Scheduled(cron = "${zwf.reminders.digest-cron:0 0 * * * *}", zone = "${zwf.time-zone:Europe/Kyiv}")
	void digest() {
		digest.run();
	}

}
