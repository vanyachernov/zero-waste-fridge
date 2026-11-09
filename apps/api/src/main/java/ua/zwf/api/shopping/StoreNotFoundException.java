package ua.zwf.api.shopping;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class StoreNotFoundException extends ApiException {

	public static final String CODE = "STORE_NOT_FOUND";

	public StoreNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Store not found");
	}

}
