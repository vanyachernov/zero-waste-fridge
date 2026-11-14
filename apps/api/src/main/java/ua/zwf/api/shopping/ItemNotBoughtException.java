package ua.zwf.api.shopping;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** У холодильник переносимо лише куплене. */
public class ItemNotBoughtException extends ApiException {

	public static final String CODE = "ITEM_NOT_BOUGHT";

	public ItemNotBoughtException() {
		super(HttpStatus.CONFLICT, CODE, "Only bought items can be moved to the fridge");
	}

}
