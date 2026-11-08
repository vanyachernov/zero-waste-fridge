package ua.zwf.api.auth;

import java.util.Map;
import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class EmailAlreadyUsedException extends ApiException {

	public static final String CODE = "EMAIL_TAKEN";

	public EmailAlreadyUsedException() {
		super(HttpStatus.CONFLICT, CODE, "Email is already registered", Map.of("email", CODE));
	}

}
