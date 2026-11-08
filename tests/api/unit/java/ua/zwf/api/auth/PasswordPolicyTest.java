package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class PasswordPolicyTest {

	@ParameterizedTest
	@ValueSource(strings = { "12345678", "Secret-pass-123", "пароль-дуже-надійний" })
	void acceptsValidPasswords(String password) {
		assertThatCode(() -> PasswordPolicy.check(password)).doesNotThrowAnyException();
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   ", "\t\n" })
	void rejectsMissing(String password) {
		assertViolation(password, "REQUIRED");
	}

	@Test
	void rejectsShorterThanEightCharacters() {
		assertViolation("1234567", "TOO_SHORT");
	}

	@Test
	void countsCodePointsNotUtf16Units() {
		// 4 емодзі = 8 UTF-16 units, але лише 4 символи
		assertViolation("🍎🥕🧀🥛", "TOO_SHORT");
	}

	@Test
	void acceptsExactly72Bytes() {
		assertThatCode(() -> PasswordPolicy.check("a".repeat(72))).doesNotThrowAnyException();
	}

	@Test
	void rejectsMoreThan72BytesBecauseBcryptTruncates() {
		assertViolation("a".repeat(73), "TOO_LONG");
		// 37 кириличних літер = 74 байти UTF-8
		assertViolation("ж".repeat(37), "TOO_LONG");
	}

	@Test
	void violationIsBadRequestWithFieldError() {
		assertThatThrownBy(() -> PasswordPolicy.check("short")).isInstanceOfSatisfying(PasswordPolicy.Violation.class,
				v -> {
					assertThat(v.status()).isEqualTo(HttpStatus.BAD_REQUEST);
					assertThat(v.code()).isEqualTo("PASSWORD_POLICY");
					assertThat(v.fieldErrors()).containsEntry("password", "TOO_SHORT");
				});
	}

	private static void assertViolation(String password, String reason) {
		assertThatThrownBy(() -> PasswordPolicy.check(password))
			.isInstanceOfSatisfying(PasswordPolicy.Violation.class,
					v -> assertThat(v.fieldErrors()).containsEntry("password", reason));
	}

}
