package ua.zwf.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Конфігурація безпеки.
 *
 * <ul>
 *   <li>{@code /api/**} — лише для автентифікованих; без сесії повертаємо 401 (а не редірект на форму),
 *       SPA сама переходить на сторінку входу.</li>
 *   <li>Статика вітрини та SPA, health і OpenAPI — публічні.</li>
 *   <li>B-04 CSRF: токен у cookie {@code XSRF-TOKEN} (читається JS), SPA дзеркалить його в заголовок
 *       {@code X-XSRF-TOKEN} для POST/PUT/PATCH/DELETE ({@code packages/api-client/src/http.ts}).</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

	public static final String CSRF_COOKIE = "XSRF-TOKEN";

	public static final String CSRF_HEADER = "X-XSRF-TOKEN";

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, CookieCsrfTokenRepository csrfTokenRepository)
			throws Exception {
		var api = PathPatternRequestMatcher.withDefaults().matcher("/api/**");

		http
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
				.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				.requestMatchers("/api/auth/csrf").permitAll()
				.requestMatchers(api).authenticated()
				.anyRequest().permitAll())
			.csrf(csrf -> csrf
				// spa(): cookie-репозиторій + обробник, що приймає «сирий» токен із заголовка (з cookie)
				.spa()
				.csrfTokenRepository(csrfTokenRepository))
			.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
			.exceptionHandling(ex -> ex
				.defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), api))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		return http.build();
	}

	/** Окремий бін — той самий репозиторій потрібен під час логіну для ротації токена (B-03). */
	@Bean
	CookieCsrfTokenRepository csrfTokenRepository() {
		var repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
		repository.setCookieName(CSRF_COOKIE);
		repository.setHeaderName(CSRF_HEADER);
		repository.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Lax"));
		return repository;
	}

	/**
	 * Порожнє сховище користувачів — щоб Spring Boot не генерував дефолтного user/password.
	 * Буде замінено на JPA-реалізацію в B-02/B-03.
	 */
	@Bean
	UserDetailsService userDetailsService() {
		return new InMemoryUserDetailsManager();
	}

}
