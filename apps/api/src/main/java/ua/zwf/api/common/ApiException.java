package ua.zwf.api.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Очікувана бізнес-помилка API. Перетворюється на RFC 9457 ProblemDetail з машинним {@code code},
 * який фронтенд локалізує (тексти помилок живуть у {@code packages/i18n}, а не на бекенді).
 */
public abstract class ApiException extends RuntimeException {

	private final HttpStatus status;

	private final String code;

	private final Map<String, String> fieldErrors;

	protected ApiException(HttpStatus status, String code, String message) {
		this(status, code, message, Map.of());
	}

	protected ApiException(HttpStatus status, String code, String message, Map<String, String> fieldErrors) {
		super(message);
		this.status = status;
		this.code = code;
		this.fieldErrors = Map.copyOf(fieldErrors);
	}

	public HttpStatus status() {
		return status;
	}

	public String code() {
		return code;
	}

	/** Поле → код помилки поля (порожньо, якщо помилка не прив'язана до полів). */
	public Map<String, String> fieldErrors() {
		return fieldErrors;
	}

}
