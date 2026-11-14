package ua.zwf.api.auth;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** Сесія посилається на користувача, якого вже немає (видалено) — SPA має перейти на вхід. */
public class SessionExpiredException extends ApiException {

	public static final String CODE = "SESSION_EXPIRED";

	public SessionExpiredException() {
		super(HttpStatus.UNAUTHORIZED, CODE, "Session is no longer valid");
	}

}
