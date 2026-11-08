package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class SessionExpiredExceptionTest {

	@Test
	void isUnauthorizedWithStableCode() {
		var ex = new SessionExpiredException();
		assertThat(ex.status()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(ex.code()).isEqualTo("SESSION_EXPIRED");
		assertThat(ex.fieldErrors()).isEmpty();
	}

}
