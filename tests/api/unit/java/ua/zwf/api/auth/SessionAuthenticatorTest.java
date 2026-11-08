package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;

class SessionAuthenticatorTest {

	static final Duration DEFAULT_TIMEOUT = Duration.ofHours(12);

	static final int THIRTY_DAYS = (int) Duration.ofDays(30).toSeconds();

	private final SessionAuthenticator authenticator = new SessionAuthenticator(
			CookieCsrfTokenRepository.withHttpOnlyFalse(), new AttributeRememberMeServices(), DEFAULT_TIMEOUT);

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void storesAuthenticationInNewSession() {
		var request = new MockHttpServletRequest("POST", "/api/auth/register");
		var auth = authentication();

		authenticator.signIn(auth, false, request, new MockHttpServletResponse());

		var session = request.getSession(false);
		assertThat(session).isNotNull();
		var context = (SecurityContext) session
			.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
		assertThat(context.getAuthentication()).isSameAs(auth);
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(auth);
	}

	@Test
	void changesIdOfExistingSessionToPreventFixation() {
		var request = new MockHttpServletRequest("POST", "/api/auth/login");
		var before = request.getSession(true).getId();
		// браузер прийшов із cookie цієї сесії
		request.setRequestedSessionId(before);
		request.setRequestedSessionIdValid(true);

		authenticator.signIn(authentication(), false, request, new MockHttpServletResponse());

		assertThat(request.getSession(false).getId()).isNotEqualTo(before);
	}

	@Test
	void rotatesCsrfTokenAndWritesNewCookieInSameResponse() {
		var request = new MockHttpServletRequest("POST", "/api/auth/login");
		request.setCookies(new Cookie("XSRF-TOKEN", "old-token"));
		var response = new MockHttpServletResponse();

		authenticator.signIn(authentication(), false, request, response);

		var written = Arrays.stream(response.getCookies()).filter(c -> c.getName().equals("XSRF-TOKEN")).toList();
		// спочатку видалення старої (Max-Age=0), потім нова
		assertThat(written).hasSizeGreaterThanOrEqualTo(2);
		assertThat(written.getLast().getValue()).isNotBlank().isNotEqualTo("old-token");
		assertThat(request.getAttribute(CsrfToken.class.getName())).isNotNull();
	}

	@Test
	void rememberMeExtendsSessionTo30DaysAndMarksCookiePersistent() {
		var request = new MockHttpServletRequest("POST", "/api/auth/login");

		authenticator.signIn(authentication(), true, request, new MockHttpServletResponse());

		assertThat(request.getSession(false).getMaxInactiveInterval()).isEqualTo(THIRTY_DAYS);
		assertThat(request.getAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR)).isEqualTo(true);
	}

	@Test
	void withoutRememberMeUsesDefaultTimeoutEvenIfSessionWasRememberedBefore() {
		var request = new MockHttpServletRequest("POST", "/api/auth/login");
		request.getSession(true).setMaxInactiveInterval(THIRTY_DAYS);

		authenticator.signIn(authentication(), false, request, new MockHttpServletResponse());

		assertThat(request.getSession(false).getMaxInactiveInterval()).isEqualTo((int) DEFAULT_TIMEOUT.toSeconds());
		assertThat(request.getAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR)).isNull();
	}

	private static UsernamePasswordAuthenticationToken authentication() {
		var principal = new AppUserPrincipal(UUID.randomUUID(), "olena@example.com", "Олена", null);
		return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
	}

}
