package ua.zwf.api.household;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** У сім'ї має лишатися хоча б один власник: спершу призначте іншого. */
public class LastOwnerException extends ApiException {

	public static final String CODE = "LAST_OWNER";

	public LastOwnerException() {
		super(HttpStatus.CONFLICT, CODE, "The household must keep at least one owner");
	}

}
