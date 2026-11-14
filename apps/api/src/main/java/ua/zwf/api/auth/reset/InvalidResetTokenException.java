package ua.zwf.api.auth.reset;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** Токена немає, він прострочений або вже використаний — причину не уточнюємо. */
public class InvalidResetTokenException extends ApiException {

	public static final String CODE = "INVALID_RESET_TOKEN";

	public InvalidResetTokenException() {
		super(HttpStatus.BAD_REQUEST, CODE, "Password reset link is invalid or has expired");
	}

}
