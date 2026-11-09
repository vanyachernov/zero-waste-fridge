package ua.zwf.api.shopping;

import java.util.Map;
import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class StoreExistsException extends ApiException {

	public static final String CODE = "STORE_EXISTS";

	public StoreExistsException() {
		super(HttpStatus.CONFLICT, CODE, "Store with this name already exists", Map.of("name", CODE));
	}

}
