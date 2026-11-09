package ua.zwf.api.shopping;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.StorageZone;

/**
 * Тіло {@code POST /api/shopping-list/move-to-fridge}. {@code items} відсутнє — перенести всі куплені
 * з типовими значеннями (CTA «Додати в холодильник (N т.)»). Інакше — лише вказані позиції, з
 * можливістю поправити термін, зону й категорію (F-52).
 */
public record MoveToFridgeRequest(List<Item> items) {

	public record Item(UUID id, LocalDate expiresAt, StorageZone zone, ProductCategory category) {
	}

}
