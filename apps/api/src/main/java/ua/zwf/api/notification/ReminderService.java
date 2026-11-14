package ua.zwf.api.notification;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.household.HouseholdPermission;
import ua.zwf.api.household.Membership;
import ua.zwf.api.product.Product;

/**
 * B-31: нагадування про терміни. Продукт «час нагадати», коли {@code effectiveExpiresAt − remindBeforeDays ≤ сьогодні}
 * (у поясі користувачів) і про цей термін ще не нагадували. Сповіщення отримує кожен учасник сім'ї з правом
 * {@link HouseholdPermission#RECEIVE_REMINDERS} (за матрицею — усі). Ідемпотентно: повторний запуск нічого не дублює.
 */
@Service
public class ReminderService {

	private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

	private final EntityManager em;

	private final NotificationRepository notifications;

	private final ReminderRecipients recipients;

	private final ApplicationEventPublisher events;

	private final Today today;

	private final Clock clock;

	public ReminderService(EntityManager em, NotificationRepository notifications, ReminderRecipients recipients,
			ApplicationEventPublisher events, Today today, Clock clock) {
		this.em = em;
		this.notifications = notifications;
		this.recipients = recipients;
		this.events = events;
		this.today = today;
		this.clock = clock;
	}

	/** @return скільки сповіщень створено */
	@Transactional
	public int run() {
		LocalDate date = today.date();
		@SuppressWarnings("unchecked")
		List<UUID> due = em.createNativeQuery("""
				select id from product
				where status = 'ACTIVE'
				  and effective_expires_at - remind_before_days <= :today
				  and (reminder_sent_for is null or reminder_sent_for <> effective_expires_at)""", UUID.class)
			.setParameter("today", date)
			.getResultList();
		if (due.isEmpty()) {
			return 0;
		}
		var now = clock.instant();
		List<Notification> created = new ArrayList<>();
		for (UUID id : due) {
			Product product = em.find(Product.class, id);
			int daysLeft = (int) ChronoUnit.DAYS.between(date, product.getEffectiveExpiresAt());
			UUID householdId = product.getHousehold().getId();
			for (Membership member : recipients.of(householdId)) {
				created.add(new Notification(member.getUser().getId(), householdId, NotificationType.EXPIRY_REMINDER,
						product.getId(), product.getName(), daysLeft, now));
			}
			product.markReminded();
		}
		notifications.saveAll(created);
		log.info("Expiry reminders: {} product(s), {} notification(s)", due.size(), created.size());
		events.publishEvent(new NotificationsCreated(created));
		return created.size();
	}

}
