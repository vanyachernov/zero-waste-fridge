package ua.zwf.api.household;

import java.util.Map;
import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class AlreadyMemberException extends ApiException {

	public static final String CODE = "ALREADY_MEMBER";

	public AlreadyMemberException() {
		super(HttpStatus.CONFLICT, CODE, "Already a member of this household", Map.of("email", CODE));
	}

}
