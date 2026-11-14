package ua.zwf.api.household;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class InviteNotFoundException extends ApiException {

	public static final String CODE = "INVITE_NOT_FOUND";

	public InviteNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Invite not found");
	}

}
