package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;

class AttributeRememberMeServicesTest {

	private final AttributeRememberMeServices services = new AttributeRememberMeServices();

	@Test
	void requestedViaAttributeNotFormParameter() {
		var request = new MockHttpServletRequest();
		request.setParameter("remember-me", "true");
		assertThat(services.rememberMeRequested(request, "remember-me")).isFalse();

		AttributeRememberMeServices.request(request);
		assertThat(services.rememberMeRequested(request, "remember-me")).isTrue();
	}

	@Test
	void loginSuccessMarksRequestAndExtendsSession() {
		var request = new MockHttpServletRequest();
		AttributeRememberMeServices.request(request);

		services.loginSuccess(request, new MockHttpServletResponse(), new TestingAuthenticationToken("u", null));

		assertThat(request.getAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR)).isEqualTo(true);
		assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(30 * 24 * 60 * 60);
	}

	@Test
	void loginSuccessWithoutRequestDoesNothing() {
		var request = new MockHttpServletRequest();

		services.loginSuccess(request, new MockHttpServletResponse(), new TestingAuthenticationToken("u", null));

		assertThat(request.getAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR)).isNull();
		assertThat(request.getSession(false)).isNull();
	}

}
