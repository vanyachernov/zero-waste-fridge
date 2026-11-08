package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class JsonLogoutSuccessHandlerTest {

	@Test
	void respondsNoContentWithFreshCsrfCookie() throws Exception {
		var handler = new JsonLogoutSuccessHandler(new SecurityConfig().csrfTokenRepository());
		var response = new MockHttpServletResponse();

		handler.onLogoutSuccess(new MockHttpServletRequest("POST", "/api/auth/logout"), response, null);

		assertThat(response.getStatus()).isEqualTo(204);
		assertThat(response.getContentAsString()).isEmpty();
		assertThat(response.getCookie("XSRF-TOKEN").getValue()).isNotBlank();
	}

}
