package ua.zwf.api.auth.reset;

import java.time.Duration;
import java.util.Map;
import org.springframework.web.util.UriComponentsBuilder;
import ua.zwf.api.mail.MailTemplates;
import ua.zwf.api.mail.OutgoingMail;

/** Лист «Відновлення пароля» з шаблонів {@code mail/password-reset.{html,txt}} (B-30). */
final class PasswordResetMail {

	static final String SUBJECT = "Zero Waste Fridge — відновлення пароля";

	private PasswordResetMail() {
	}

	/** Сторінка SPA, що приймає токен (F-13). */
	static String link(String publicUrl, String token) {
		return UriComponentsBuilder.fromUriString(publicUrl)
			.path("/lms/reset-password")
			.queryParam("token", token)
			.build()
			.toUriString();
	}

	static OutgoingMail create(MailTemplates templates, String to, String name, String link, Duration ttl) {
		return templates.render(to, SUBJECT, "password-reset",
				Map.of("name", name, "link", link, "minutes", ttl.toMinutes()));
	}

}
