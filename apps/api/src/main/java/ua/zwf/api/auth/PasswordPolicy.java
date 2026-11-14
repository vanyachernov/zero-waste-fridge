package ua.zwf.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/**
 * Правила пароля (реєстрація, скидання пароля).
 * Мінімум 8 символів; максимум 72 байти UTF-8 — більше BCrypt просто ігнорує.
 */
public final class PasswordPolicy {

	public static final int MIN_LENGTH = 8;

	public static final int MAX_BYTES = 72;

	private PasswordPolicy() {
	}

	public static void check(String password) {
		if (password == null || password.isBlank()) {
			throw new Violation("REQUIRED");
		}
		if (password.codePointCount(0, password.length()) < MIN_LENGTH) {
			throw new Violation("TOO_SHORT");
		}
		if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
			throw new Violation("TOO_LONG");
		}
	}

	public static final class Violation extends ApiException {

		public static final String CODE = "PASSWORD_POLICY";

		Violation(String reason) {
			super(HttpStatus.BAD_REQUEST, CODE, "Password does not satisfy the policy: " + reason,
					Map.of("password", reason));
		}

	}

}
