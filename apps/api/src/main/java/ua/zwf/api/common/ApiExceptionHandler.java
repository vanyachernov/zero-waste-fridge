package ua.zwf.api.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import tools.jackson.core.JacksonException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Єдиний формат помилок {@code /api}: ProblemDetail ({@code application/problem+json}) з полями
 * {@code code} (машинний код) та, для помилок валідації, {@code errors} ({@code поле → код}).
 *
 * <p>Обмежено пакетом {@code ua.zwf.api} — статика (D-02) і далі віддає HTML-сторінку 404.
 */
@RestControllerAdvice(basePackages = "ua.zwf.api")
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	public static final String VALIDATION_FAILED = "VALIDATION_FAILED";

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ProblemDetail> handleApiException(ApiException ex) {
		return ResponseEntity.status(ex.status()).body(problem(ex.status(), ex.code(), ex.getMessage(), ex.fieldErrors()));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError error : ex.getBindingResult().getFieldErrors()) {
			// Код обмеження (NotBlank, Email, Size…) — фронт перекладає його сам
			errors.putIfAbsent(error.getField(), error.getCode());
		}
		var body = problem(HttpStatus.BAD_REQUEST, VALIDATION_FAILED, "Request validation failed", errors);
		return ResponseEntity.badRequest().body(body);
	}

	public static final String INVALID = "INVALID";

	public static final String MALFORMED_REQUEST = "MALFORMED_REQUEST";

	/**
	 * Невідомий код ({@code "category": "fish"}), не той тип або зламаний JSON. Якщо Jackson знає шлях
	 * до поля — повертаємо помилку поля, як для валідації, щоб форма підсвітила саме його.
	 */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Throwable cause = ex.getCause();
		while (cause != null && !(cause instanceof JacksonException)) {
			cause = cause.getCause();
		}
		if (cause instanceof JacksonException jackson && !jackson.getPath().isEmpty()) {
			String field = jackson.getPath()
				.stream()
				.map(ref -> ref.getPropertyName() != null ? ref.getPropertyName() : "[" + ref.getIndex() + "]")
				.reduce((a, b) -> b.startsWith("[") ? a + b : a + "." + b)
				.orElse("body");
			var body = problem(HttpStatus.BAD_REQUEST, VALIDATION_FAILED, "Request validation failed",
					Map.of(field, INVALID));
			return ResponseEntity.badRequest().body(body);
		}
		return ResponseEntity.badRequest()
			.body(problem(HttpStatus.BAD_REQUEST, MALFORMED_REQUEST, "Malformed JSON request", Map.of()));
	}

	/** Невідоме значення query-параметра ({@code ?sort=price}, {@code ?category=fish}). */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		return ResponseEntity.badRequest()
			.body(problem(HttpStatus.BAD_REQUEST, VALIDATION_FAILED, "Request validation failed",
					Map.of(ex.getName(), INVALID)));
	}

	static ProblemDetail problem(HttpStatus status, String code, String detail, Map<String, String> errors) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setProperty("code", code);
		if (!errors.isEmpty()) {
			problem.setProperty("errors", errors);
		}
		return problem;
	}

}
