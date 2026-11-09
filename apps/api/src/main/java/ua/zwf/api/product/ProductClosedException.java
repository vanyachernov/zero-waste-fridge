package ua.zwf.api.product;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** Продукт уже списано (з'їдено / в рецепті / викинуто) — змінювати його не можна. */
public class ProductClosedException extends ApiException {

	public static final String CODE = "PRODUCT_CLOSED";

	public ProductClosedException() {
		super(HttpStatus.CONFLICT, CODE, "Product is already written off");
	}

}
