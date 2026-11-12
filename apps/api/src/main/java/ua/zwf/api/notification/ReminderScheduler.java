package ua.zwf.api.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Щогодини запускає {@link ReminderService} (на 5-й хвилині) і щохвилини {@link DigestService}. У тестах вимкнено
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

	/** B-33: щохвилини — дайджест тим, у кого настав обраний час, а лист за сьогодні ще не йшов. */
	@Scheduled(cron = "${zwf.reminders.digest-cron:0 * * * * *}", zone = "${zwf.time-zone:Europe/Kyiv}")
	void digest() {
		digest.run();
	}

}
