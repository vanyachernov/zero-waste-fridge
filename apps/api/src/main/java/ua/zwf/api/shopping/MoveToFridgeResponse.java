package ua.zwf.api.shopping;

import java.util.List;
import ua.zwf.api.product.ProductResponse;

/** Створені продукти холодильника; перенесені позиції зі списку прибрано. */
public record MoveToFridgeResponse(int moved, List<ProductResponse> products) {
}
