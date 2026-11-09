package ua.zwf.api.product;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** І неіснуючий, і чужий (іншого домогосподарства) продукт — однаковий 404, щоб не розкривати чужі id. */
public class ProductNotFoundException extends ApiException {

	public static final String CODE = "PRODUCT_NOT_FOUND";

	public ProductNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Product not found");
	}

}
