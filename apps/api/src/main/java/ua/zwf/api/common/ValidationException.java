package ua.zwf.api.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Помилки полів, знайдені в сервісі (не Bean Validation), у тому самому форматі {@code errors: {поле → код}}. */
public class ValidationException extends ApiException {

	public ValidationException(Map<String, String> fieldErrors) {
		super(HttpStatus.BAD_REQUEST, ApiExceptionHandler.VALIDATION_FAILED, "Request validation failed", fieldErrors);
	}

}
