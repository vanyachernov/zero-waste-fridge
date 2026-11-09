package ua.zwf.api.shopping;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

public class ShoppingItemNotFoundException extends ApiException {

	public static final String CODE = "SHOPPING_ITEM_NOT_FOUND";

	public ShoppingItemNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Shopping list item not found");
	}

}
