package ua.zwf.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfTokenRepository;

/**
 * Після виходу: 204 без тіла і одразу новий {@code XSRF-TOKEN} (старий видалив CsrfLogoutHandler) —
 * щоб SPA могла відразу показати форму входу й відправити її без додаткового запиту за токеном.
 */
public final class JsonLogoutSuccessHandler implements LogoutSuccessHandler {

	private final CsrfTokenRepository csrfTokenRepository;

	public JsonLogoutSuccessHandler(CsrfTokenRepository csrfTokenRepository) {
		this.csrfTokenRepository = csrfTokenRepository;
	}

	@Override
	public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) {
		csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(request), request, response);
		response.setStatus(HttpServletResponse.SC_NO_CONTENT);
	}

}
