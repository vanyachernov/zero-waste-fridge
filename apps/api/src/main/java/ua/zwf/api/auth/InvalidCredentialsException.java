package ua.zwf.api.auth;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** Однакова відповідь для невідомого email і неправильного пароля — не розкриваємо, хто зареєстрований. */
public class InvalidCredentialsException extends ApiException {

	public static final String CODE = "INVALID_CREDENTIALS";

	public InvalidCredentialsException() {
		super(HttpStatus.UNAUTHORIZED, CODE, "Invalid email or password");
	}

}
