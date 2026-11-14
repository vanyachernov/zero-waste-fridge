package ua.zwf.api.recipe;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** F-45: з обраних продуктів нічого не вийшло — «змініть продукти». */
public class NoRecipeException extends ApiException {

	public static final String CODE = "NO_RECIPE";

	public NoRecipeException() {
		super(HttpStatus.UNPROCESSABLE_CONTENT, CODE, "No recipe for the selected products");
	}

}
