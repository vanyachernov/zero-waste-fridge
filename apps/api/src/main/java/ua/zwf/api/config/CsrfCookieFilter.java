package ua.zwf.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * B-04: Spring Security генерує CSRF-токен ліниво — cookie {@code XSRF-TOKEN} з'являється, лише коли
 * хтось прочитав токен. SPA ж читає його з cookie ще до першого POST, тому примусово «торкаємося»
 * токена на кожному запиті: перший же GET (сторінка, {@code /api/auth/me}) видає cookie.
 */
public final class CsrfCookieFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
			token.getToken();
		}
		chain.doFilter(request, response);
	}

}
