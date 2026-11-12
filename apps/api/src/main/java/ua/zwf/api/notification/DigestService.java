package ua.zwf.api.notification;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.config.ZwfProperties;
import ua.zwf.api.household.Membership;
import ua.zwf.api.mail.ExpiryDigestMail;
import ua.zwf.api.mail.MailTemplates;
import ua.zwf.api.mail.Mailer;
import ua.zwf.api.product.Product;

/**
 * B-33: щоденний email-дайджест «N продуктів потребують уваги» — прострочені, сьогодні й завтра. Іде в обрану
 * користувачем годину (B-34), не частіше разу на день і лише коли є що сказати.
 */
@Service
public class DigestService {

	private static final Logger log = LoggerFactory.getLogger(DigestService.class);

	/** Сьогодні або завтра (і вже прострочені). */
	static final int HORIZON_DAYS = 1;

	private final EntityManager em;

	private final NotificationSettingsService settingsService;

	private final NotificationSettingsRepository settingsRepository;

	private final Mailer mailer;

	private final MailTemplates templates;

	private final ZwfProperties properties;

	private final Today today;

	private final Clock clock;

	public DigestService(EntityManager em, NotificationSettingsService settingsService,
			NotificationSettingsRepository settingsRepository, Mailer mailer, MailTemplates templates,
			ZwfProperties properties, Today today, Clock clock) {
		this.em = em;
		this.settingsService = settingsService;
		this.settingsRepository = settingsRepository;
		this.mailer = mailer;
		this.templates = templates;
		this.properties = properties;
		this.today = today;
		this.clock = clock;
	}

	/** @return скільки листів надіслано */
	@Transactional
	public int run() {
		LocalDate date = today.date();
		int hour = ZonedDateTime.now(clock.withZone(today.zone())).getHour();
		List<Membership> members = em.createQuery("select m from Membership m join fetch m.user join fetch m.household",
				Membership.class)
			.getResultList();
		var settings = settingsService.of(members.stream().map(m -> m.getUser().getId()).toList());

		var due = members.stream().filter(m -> {
			var s = settings.get(m.getUser().getId());
			return s.isEmailDigest() && s.getDigestHour() == hour && !date.equals(s.getDigestSentOn());
		}).toList();
		if (due.isEmpty()) {
			return 0;
		}
		Map<UUID, List<Product>> urgent = urgentProducts(due.stream().map(m -> m.getHousehold().getId()).distinct().toList(),
				date);

		int sent = 0;
		for (Membership member : due) {
			var products = urgent.getOrDefault(member.getHousehold().getId(), List.of());
			if (products.isEmpty()) {
				continue;
			}
			var lines = products.stream()
				.map(p -> ExpiryDigestMail.Line.of(p.getName(), ChronoUnit.DAYS.between(date, p.getEffectiveExpiresAt())))
				.toList();
			var user = member.getUser();
			try {
				mailer.send(ExpiryDigestMail.create(templates, user.getEmail(), user.getName(),
						member.getHousehold().getName(), lines, properties.publicUrl() + "/lms/"));
				var s = settings.get(user.getId());
				s.markDigestSent(date);
				settingsRepository.save(s);
				sent++;
			}
			catch (MailException ex) {
				// Наступна спроба — за годину не буде (година інша); завтра лист піде знову
				log.error("Could not send expiry digest to user {}", user.getId(), ex);
			}
		}
		log.info("Expiry digest: {} mail(s) sent", sent);
		return sent;
	}

	private Map<UUID, List<Product>> urgentProducts(List<UUID> householdIds, LocalDate date) {
		return em.createQuery("""
				select p from Product p
				where p.household.id in :households and p.status = ua.zwf.api.product.ProductStatus.ACTIVE
				  and p.effectiveExpiresAt <= :until
				order by p.effectiveExpiresAt, p.name""", Product.class)
			.setParameter("households", householdIds)
			.setParameter("until", date.plusDays(HORIZON_DAYS))
			.getResultList()
			.stream()
			.collect(Collectors.groupingBy(p -> p.getHousehold().getId()));
	}

}
