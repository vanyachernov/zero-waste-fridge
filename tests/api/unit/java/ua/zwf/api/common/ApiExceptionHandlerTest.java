package ua.zwf.api.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.ServletWebRequest;
import ua.zwf.api.auth.EmailAlreadyUsedException;

class ApiExceptionHandlerTest {

	private final ApiExceptionHandler handler = new ApiExceptionHandler();

	@Test
	void apiExceptionBecomesProblemDetailWithCode() {
		var response = handler.handleApiException(new EmailAlreadyUsedException());

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		ProblemDetail body = response.getBody();
		assertThat(body.getStatus()).isEqualTo(409);
		assertThat(body.getProperties()).containsEntry("code", "EMAIL_TAKEN")
			.containsEntry("errors", Map.of("email", "EMAIL_TAKEN"));
	}

	@Test
	void validationErrorsAreMappedToConstraintCodesFirstErrorPerField() throws Exception {
		var target = new Object();
		var binding = new BeanPropertyBindingResult(target, "registerRequest");
		binding.addError(new FieldError("registerRequest", "email", null, false, new String[] { "Email" }, null, "bad"));
		binding.addError(new FieldError("registerRequest", "email", null, false, new String[] { "Size" }, null, "long"));
		binding.addError(new FieldError("registerRequest", "name", null, false, new String[] { "NotBlank" }, null, "x"));
		var parameter = new MethodParameter(Object.class.getMethod("equals", Object.class), 0);
		var exception = new MethodArgumentNotValidException(parameter, binding);

		var response = handler.handleMethodArgumentNotValid(exception, new HttpHeaders(), HttpStatus.BAD_REQUEST,
				new ServletWebRequest(new MockHttpServletRequest()));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		var body = (ProblemDetail) response.getBody();
		assertThat(body.getProperties()).containsEntry("code", "VALIDATION_FAILED")
			.containsEntry("errors", Map.of("email", "Email", "name", "NotBlank"));
	}

	@Test
	void omitsErrorsWhenThereAreNone() {
		var problem = ApiExceptionHandler.problem(HttpStatus.UNAUTHORIZED, "X", "detail", Map.of());
		assertThat(problem.getProperties()).containsOnlyKeys("code");
	}

}
