package ua.zwf.api.recipe;

import org.springframework.http.HttpStatus;
import ua.zwf.api.common.ApiException;

/** Немає такого або це згенерований рецепт іншої сім'ї. */
public class RecipeNotFoundException extends ApiException {

	public static final String CODE = "RECIPE_NOT_FOUND";

	public RecipeNotFoundException() {
		super(HttpStatus.NOT_FOUND, CODE, "Recipe not found");
	}

}
