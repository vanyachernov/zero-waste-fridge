package ua.zwf.api.household;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class InvalidInviteException extends ApiException {

	public static final String CODE = "INVALID_INVITE";

	public InvalidInviteException() {
		super(HttpStatus.BAD_REQUEST, CODE, "Invite or code is invalid or expired");
	}

}
