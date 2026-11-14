package ua.zwf.api.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * B-33: ключі VAPID для Web Push ({@code zwf.push.*}). Згенерувати: {@code npx web-push generate-vapid-keys}.
 * Без ключів push вимкнено: підписки приймаються, але нічого не надсилається.
 *
 * @param publicKey публічний ключ (base64url) — його бере браузер для підписки
 * @param privateKey приватний ключ (base64url)
 * @param subject контакт для push-сервісів, напр. {@code mailto:admin@zerowastefridge.app}
 */
@ConfigurationProperties("zwf.push")
public record PushProperties(String publicKey, String privateKey, String subject) {

	public PushProperties {
		subject = subject == null || subject.isBlank() ? "mailto:no-reply@zerowastefridge.app" : subject;
	}

	public boolean enabled() {
		return publicKey != null && !publicKey.isBlank() && privateKey != null && !privateKey.isBlank();
	}

}
