package ua.zwf.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;

/**
 * «Запам'ятати мене» засобами Spring Session: замість окремої remember-me cookie подовжуємо саму сесію
 * (30 днів неактивності) і робимо cookie {@code ZWF_SESSION} постійною. Boot сам налаштовує cookie serializer,
 * побачивши бін {@link SpringSessionRememberMeServices}.
 *
 * <p>Стандартна реалізація читає прапорець із параметра форми; у нас JSON, тому — з атрибута запиту.
 */
public class AttributeRememberMeServices extends SpringSessionRememberMeServices {

	public static final String REQUESTED_ATTR = AttributeRememberMeServices.class.getName() + ".REQUESTED";

	public static void request(HttpServletRequest request) {
		request.setAttribute(REQUESTED_ATTR, Boolean.TRUE);
	}

	@Override
	protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
		return Boolean.TRUE.equals(request.getAttribute(REQUESTED_ATTR));
	}

}
