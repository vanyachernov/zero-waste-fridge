package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ConstraintViolation;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Bean Validation DTO реєстрації — без Spring, напряму через Hibernate Validator. */
class RegisterRequestTest {

	static jakarta.validation.ValidatorFactory factory;

	static Validator validator;

	@BeforeAll
	static void setUp() {
		factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@AfterAll
	static void tearDown() {
		factory.close();
	}

	@Test
	void stripsEmailSoPastedSpacesPassValidation() {
		var request = new RegisterRequest("Олена", "  olena@example.com \n", "Secret-pass-123");

		assertThat(request.email()).isEqualTo("olena@example.com");
		assertThat(validator.validate(request)).isEmpty();
	}

	@Test
	void reportsConstraintPerField() {
		var violations = violations(new RegisterRequest(" ", "nope", "x"));

		assertThat(violations).containsEntry("name", "NotBlank").containsEntry("email", "Email");
	}

	@Test
	void enforcesMaxLengths() {
		var violations = violations(new RegisterRequest("я".repeat(81), "a".repeat(250) + "@b.cd", "x"));

		assertThat(violations).containsEntry("name", "Size").containsKey("email");
	}

	@Test
	void nullEmailIsRequired() {
		assertThat(violations(new RegisterRequest("Олена", null, "x"))).containsEntry("email", "NotBlank");
	}

	@Test
	void toStringNeverLeaksPassword() {
		assertThat(new RegisterRequest("Олена", "a@b.c", "Secret-pass-123").toString())
			.doesNotContain("Secret-pass-123")
			.contains("password=***");
	}

	private static Map<String, String> violations(RegisterRequest request) {
		return validator.validate(request)
			.stream()
			.collect(Collectors.toMap(v -> v.getPropertyPath().toString(), RegisterRequestTest::constraint,
					(a, b) -> a));
	}

	private static String constraint(ConstraintViolation<?> violation) {
		return violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName();
	}

}
