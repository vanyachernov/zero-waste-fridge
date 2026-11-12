package ua.zwf.api.notification;

import java.time.Clock;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ValidationException;

/** B-34: {@code GET / PUT /api/me/notification-settings}. */
@Service
public class NotificationSettingsService {

	public record QuietHours(Integer from, Integer to) {
	}

	public record SettingsResponse(boolean inApp, boolean emailDigest, boolean push, String digestTime,
			QuietHours quietHours) {

		static SettingsResponse of(NotificationSettings s) {
			var quiet = s.getQuietFrom() == null ? null : new QuietHours(s.getQuietFrom(), s.getQuietTo());
			return new SettingsResponse(s.isInApp(), s.isEmailDigest(), s.isPush(), s.getDigestTime().format(HH_MM),
					quiet);
		}

	}

	public record SettingsRequest(Boolean inApp, Boolean emailDigest, Boolean push, String digestTime,
			QuietHours quietHours) {
	}

	/** Час листа в API — {@code "HH:mm"}, 24-годинний формат. */
	static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

	private final NotificationSettingsRepository settings;

	private final Clock clock;

	public NotificationSettingsService(NotificationSettingsRepository settings, Clock clock) {
		this.settings = settings;
		this.clock = clock;
	}

	/** Без збереженого рядка — значення за замовчуванням (нічого не пишемо на GET). */
	@Transactional(readOnly = true)
	public NotificationSettings of(UUID userId) {
		return settings.findById(userId).orElseGet(() -> NotificationSettings.defaults(userId));
	}

	/** Для розсилок: налаштування всіх користувачів одним запитом, за замовчуванням — де рядка немає. */
	@Transactional(readOnly = true)
	public Map<UUID, NotificationSettings> of(List<UUID> userIds) {
		Map<UUID, NotificationSettings> stored = settings.findByUserIdIn(userIds)
			.stream()
			.collect(Collectors.toMap(NotificationSettings::getUserId, Function.identity()));
		Map<UUID, NotificationSettings> result = new LinkedHashMap<>();
		userIds.forEach(id -> result.put(id, stored.getOrDefault(id, NotificationSettings.defaults(id))));
		return result;
	}

	@Transactional(readOnly = true)
	public SettingsResponse get(UUID userId) {
		return SettingsResponse.of(of(userId));
	}

	@Transactional
	public SettingsResponse put(UUID userId, SettingsRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		if (request == null) {
			throw new ValidationException(Map.of("inApp", "NotNull"));
		}
		if (request.inApp() == null) {
			errors.put("inApp", "NotNull");
		}
		if (request.emailDigest() == null) {
			errors.put("emailDigest", "NotNull");
		}
		if (request.push() == null) {
			errors.put("push", "NotNull");
		}
		LocalTime time = NotificationSettings.DEFAULT_DIGEST_TIME;
		if (request.digestTime() != null) {
			try {
				time = LocalTime.parse(request.digestTime().strip(), HH_MM);
			}
			catch (DateTimeParseException ex) {
				errors.put("digestTime", "INVALID");
			}
		}
		var quiet = request.quietHours();
		if (quiet != null) {
			if (quiet.from() == null || quiet.from() < 0 || quiet.from() > 23) {
				errors.put("quietHours.from", "Range");
			}
			if (quiet.to() == null || quiet.to() < 0 || quiet.to() > 23) {
				errors.put("quietHours.to", "Range");
			}
			if (quiet.from() != null && quiet.from().equals(quiet.to())) {
				errors.put("quietHours.to", "SAME_AS_FROM");
			}
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		var current = of(userId);
		current.update(request.inApp(), request.emailDigest(), request.push(), time, quiet == null ? null : quiet.from(),
				quiet == null ? null : quiet.to(), clock.instant());
		return SettingsResponse.of(settings.save(current));
	}

}
