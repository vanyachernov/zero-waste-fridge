package ua.zwf.api.auth.reset;

import java.time.Duration;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;
import ua.zwf.api.mail.OutgoingMail;

/** Текст листа «Відновлення пароля». Шаблонізатор з'явиться разом з іншими листами (B-30). */
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

	static OutgoingMail create(String to, String name, String link, Duration ttl) {
		long minutes = ttl.toMinutes();
		String text = """
				Вітаємо, %s!

				Ми отримали запит на відновлення пароля до Zero Waste Fridge.
				Щоб задати новий пароль, перейдіть за посиланням (діє %d хв):

				%s

				Якщо ви не надсилали запит — просто проігноруйте цей лист, пароль не зміниться.
				""".formatted(name, minutes, link);
		String safeName = HtmlUtils.htmlEscape(name);
		String safeLink = HtmlUtils.htmlEscape(link);
		String html = """
				<p>Вітаємо, %s!</p>
				<p>Ми отримали запит на відновлення пароля до Zero Waste Fridge.</p>
				<p><a href="%s" style="display:inline-block;padding:10px 20px;background:#006948;color:#fff;\
				border-radius:8px;text-decoration:none;font-weight:600">Задати новий пароль</a></p>
				<p style="color:#6e7a72">Посилання діє %d хв. Якщо ви не надсилали запит — просто проігноруйте цей лист.</p>
				""".formatted(safeName, safeLink, minutes);
		return new OutgoingMail(to, SUBJECT, text, html);
	}

}
