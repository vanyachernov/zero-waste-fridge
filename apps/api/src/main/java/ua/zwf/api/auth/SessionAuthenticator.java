package ua.zwf.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Component;

/**
 * Встановлює автентифікацію в сесію після реєстрації/входу (JSON API, без formLogin) —
 * з тими ж гарантіями, що й стандартний вхід Spring Security:
 * <ol>
 *   <li>захист від фіксації сесії — ідентифікатор існуючої сесії змінюється;</li>
 *   <li>ротація CSRF-токена — новий {@code XSRF-TOKEN} одразу у відповіді;</li>
 *   <li>SecurityContext зберігається в сесії (Spring Session JDBC → cookie {@code ZWF_SESSION});</li>
 *   <li>«Запам'ятати мене» (B-03): 30 днів і постійна cookie, інакше — стандартний таймаут сесії.</li>
 * </ol>
 */
@Component
public class SessionAuthenticator {

	private final SessionAuthenticationStrategy sessionStrategy;

	private final SecurityContextRepository contextRepository;

	private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

	private final RememberMeServices rememberMeServices;

	private final Duration defaultTimeout;

	@Autowired
	public SessionAuthenticator(CsrfTokenRepository csrfTokenRepository, RememberMeServices rememberMeServices,
			@Value("${spring.session.timeout}") Duration defaultTimeout) {
		this(csrfTokenRepository, new HttpSessionSecurityContextRepository(), rememberMeServices, defaultTimeout);
	}

	SessionAuthenticator(CsrfTokenRepository csrfTokenRepository, SecurityContextRepository contextRepository,
			RememberMeServices rememberMeServices, Duration defaultTimeout) {
		this.sessionStrategy = new CompositeSessionAuthenticationStrategy(List.of(
				new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrfTokenRepository)));
		this.contextRepository = contextRepository;
		this.rememberMeServices = rememberMeServices;
		this.defaultTimeout = defaultTimeout;
	}

	public void signIn(Authentication authentication, boolean rememberMe, HttpServletRequest request,
			HttpServletResponse response) {
		sessionStrategy.onAuthentication(authentication, request, response);

		var context = holder.createEmptyContext();
		context.setAuthentication(authentication);
		holder.setContext(context);
		contextRepository.saveContext(context, request, response);

		if (rememberMe) {
			AttributeRememberMeServices.request(request);
			rememberMeServices.loginSuccess(request, response, authentication);
		}
		else {
			// Сесія могла бути «запам'ятованою» з попереднього входу — повертаємо звичайний таймаут
			request.getSession().setMaxInactiveInterval((int) defaultTimeout.toSeconds());
		}

		// CsrfAuthenticationStrategy видалив старий токен і поклав «лінивий» новий — матеріалізуємо його,
		// щоб нова cookie XSRF-TOKEN прийшла в цій же відповіді і SPA могла одразу робити POST.
		if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
			token.getToken();
		}
	}

}
