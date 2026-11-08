package ua.zwf.api.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Власні налаштування застосунку ({@code zwf.*}).
 *
 * @param publicUrl зовнішня адреса сайту без «/» в кінці — для посилань у листах
 */
@ConfigurationProperties("zwf")
public record ZwfProperties(String publicUrl, Mail mail, Auth auth) {

	public ZwfProperties {
		publicUrl = publicUrl == null || publicUrl.isBlank() ? "http://localhost:8080" : stripTrailingSlash(publicUrl);
		mail = mail == null ? new Mail(null, false) : mail;
		auth = auth == null ? new Auth(null, null) : auth;
	}

	/**
	 * @param from адреса відправника
	 * @param logContent якщо SMTP не налаштовано — писати повний текст листа в лог (лише для dev!)
	 */
	public record Mail(String from, boolean logContent) {

		public Mail {
			from = from == null || from.isBlank() ? "Zero Waste Fridge <no-reply@zerowastefridge.app>" : from;
		}

	}

	/**
	 * @param passwordResetTtl скільки діє посилання на скидання пароля
	 * @param passwordResetCooldown мінімальний інтервал між листами одному користувачу
	 */
	public record Auth(Duration passwordResetTtl, Duration passwordResetCooldown) {

		public Auth {
			passwordResetTtl = passwordResetTtl == null ? Duration.ofHours(1) : passwordResetTtl;
			passwordResetCooldown = passwordResetCooldown == null ? Duration.ofMinutes(1) : passwordResetCooldown;
		}

	}

	private static String stripTrailingSlash(String url) {
		return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
	}

}
