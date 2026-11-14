package ua.zwf.api.shopping;

import java.util.List;

/**
 * Дві секції екрана: «Треба купити» (спочатку високий пріоритет, далі в порядку додавання) і
 * «Вже куплено» (останні куплені зверху).
 */
public record ShoppingListResponse(List<ShoppingItemResponse> toBuy, List<ShoppingItemResponse> bought) {
}
