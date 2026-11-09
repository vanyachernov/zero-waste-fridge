package ua.zwf.api.tip;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import ua.zwf.api.product.ProductCategory;

/**
 * B-15: «Розумна порада дня».
 *
 * @param products продукти, про які порада (до {@link TipService#MAX_PRODUCTS}), спочатку найтерміновіші;
 *     їхні id фронтенд передає в «Підібрати рецепт» ({@code /recipes?ids=})
 * @param hint ідея страви для {@link TipKind#USE_SOON}, інакше {@code null}
 */
public record TipResponse(LocalDate date, TipKind kind, List<TipProduct> products, RecipeHint hint) {

	public record TipProduct(UUID id, String name, ProductCategory category, long daysLeft) {
	}

}
