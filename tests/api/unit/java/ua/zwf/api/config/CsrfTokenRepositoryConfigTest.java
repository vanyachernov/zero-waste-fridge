package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Перевіряє контракт cookie, на який спирається SPA: ім'я, заголовок, доступність з JS, SameSite. */
class CsrfTokenRepositoryConfigTest {

	private final SecurityConfig config = new SecurityConfig();

	@Test
	void tokenUsesSpaHeaderName() {
		var token = config.csrfTokenRepository().generateToken(new MockHttpServletRequest());
		assertThat(token.getHeaderName()).isEqualTo("X-XSRF-TOKEN");
		assertThat(token.getToken()).isNotBlank();
	}

	@Test
	void cookieIsReadableByJavascriptAndLax() {
		var repository = config.csrfTokenRepository();
		var request = new MockHttpServletRequest();
		var response = new MockHttpServletResponse();

		repository.saveToken(repository.generateToken(request), request, response);

		var cookie = response.getCookie("XSRF-TOKEN");
		assertThat(cookie).isNotNull();
		assertThat(cookie.isHttpOnly()).isFalse();
		assertThat(cookie.getPath()).isEqualTo("/");
		assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
	}

	@Test
	void savingNullTokenExpiresCookie() {
		var repository = config.csrfTokenRepository();
		var response = new MockHttpServletResponse();

		repository.saveToken(null, new MockHttpServletRequest(), response);

		assertThat(response.getCookie("XSRF-TOKEN").getMaxAge()).isZero();
	}

}
