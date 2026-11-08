package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;

class CsrfCookieFilterTest {

	private final CsrfCookieFilter filter = new CsrfCookieFilter();

	@Test
	void touchesDeferredTokenSoTheCookieIsWritten() throws Exception {
		var request = new MockHttpServletRequest("GET", "/lms/");
		var token = mock(CsrfToken.class);
		request.setAttribute(CsrfToken.class.getName(), token);
		var chain = new MockFilterChain();

		filter.doFilter(request, new MockHttpServletResponse(), chain);

		verify(token).getToken();
		assertThat(chain.getRequest()).isSameAs(request);
	}

	@Test
	void passesThroughWhenNoTokenAttribute() throws Exception {
		var request = new MockHttpServletRequest("GET", "/actuator/health");
		var chain = mock(FilterChain.class);
		var response = new MockHttpServletResponse();

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
	}

}
