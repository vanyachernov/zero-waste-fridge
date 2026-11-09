package ua.zwf.api.household;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class MemberNotFoundException extends ApiException {

	public static final String CODE = "MEMBER_NOT_FOUND";

	public MemberNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Member not found in your household");
	}

}
