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
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Базова конфігурація безпеки (B-01).
 *
 * <ul>
 *   <li>{@code /api/**} — лише для автентифікованих; без сесії повертаємо 401 (а не редірект на форму),
 *       SPA сама переходить на сторінку входу.</li>
 *   <li>Статика вітрини та SPA, health і OpenAPI — публічні.</li>
 *   <li>Логін/реєстрація (B-02, B-03) та CSRF через cookie (B-04) додаються окремими задачами.</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		var api = PathPatternRequestMatcher.withDefaults().matcher("/api/**");

		http
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
				.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				.requestMatchers(api).authenticated()
				.anyRequest().permitAll())
			.exceptionHandling(ex -> ex
				.defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), api))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		return http.build();
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
