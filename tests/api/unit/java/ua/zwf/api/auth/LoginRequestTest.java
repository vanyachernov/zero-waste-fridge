package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class LoginRequestTest {

	static ValidatorFactory factory;

	@BeforeAll
	static void setUp() {
		factory = Validation.buildDefaultValidatorFactory();
	}

	@AfterAll
	static void tearDown() {
		factory.close();
	}

	@Test
	void stripsEmailAndValidates() {
		var request = new LoginRequest("  olena@example.com ", "x", true);
		assertThat(request.email()).isEqualTo("olena@example.com");
		assertThat(factory.getValidator().validate(request)).isEmpty();
	}

	@Test
	void requiresEmailAndPassword() {
		var violations = factory.getValidator().validate(new LoginRequest(null, " ", false));
		assertThat(violations).extracting(v -> v.getPropertyPath().toString()).containsExactlyInAnyOrder("email",
				"password");
	}

	@Test
	void toStringNeverLeaksPassword() {
		assertThat(new LoginRequest("a@b.c", "Secret-pass-123", true).toString()).doesNotContain("Secret-pass-123");
	}

	@Test
	void registerRememberMeDefaultsToTrue() {
		assertThat(new RegisterRequest("Олена", "a@b.c", "x", null).rememberMe()).isTrue();
		assertThat(new RegisterRequest("Олена", "a@b.c", "x", false).rememberMe()).isFalse();
	}

}
