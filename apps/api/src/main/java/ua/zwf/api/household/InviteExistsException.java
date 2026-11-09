package ua.zwf.api.household;

import java.util.Map;
import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class InviteExistsException extends ApiException {

	public static final String CODE = "INVITE_EXISTS";

	public InviteExistsException() {
		super(HttpStatus.CONFLICT, CODE, "An open invite for this email already exists", Map.of("email", CODE));
	}

}
