package ua.zwf.api.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Щогодини (за замовчуванням на 5-й хвилині) запускає {@link ReminderService}. У тестах вимкнено
 * ({@code zwf.reminders.enabled=false}) — там сервіс викликають напряму.
 */
@Component
@ConditionalOnProperty(prefix = "zwf.reminders", name = "enabled", havingValue = "true", matchIfMissing = true)
class ReminderScheduler {

	private final ReminderService reminders;

	ReminderScheduler(ReminderService reminders) {
		this.reminders = reminders;
	}

	@Scheduled(cron = "${zwf.reminders.cron:0 5 * * * *}", zone = "${zwf.time-zone:Europe/Kyiv}")
	void run() {
		reminders.run();
	}

}
