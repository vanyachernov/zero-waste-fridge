package ua.zwf.api.household;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class InviteEmailMismatchException extends ApiException {

	public static final String CODE = "INVITE_EMAIL_MISMATCH";

	public InviteEmailMismatchException() {
		super(HttpStatus.FORBIDDEN, CODE, "This invite was sent to another email");
	}

}
