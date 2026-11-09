package ua.zwf.api.shopping;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.dictionary.Dictionaries;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductInput;
import ua.zwf.api.product.ProductResponse;
import ua.zwf.api.product.ProductService;
import ua.zwf.api.product.Unit;

/**
 * B-42: «Закінчили покупки? Додати в холодильник». Кожна куплена позиція стає продуктом: дата покупки —
 * сьогодні, термін — з довідника категорії, якщо користувач не поправив; позиція зникає зі списку.
 * Усе в одній транзакції: або переносяться всі, або жодна.
 */
@Service
public class MoveToFridgeService {

	private final ShoppingListService shopping;

	private final ShoppingItemRepository items;

	private final ProductService products;

	private final Today today;

	public MoveToFridgeService(ShoppingListService shopping, ShoppingItemRepository items, ProductService products,
			Today today) {
		this.shopping = shopping;
		this.items = items;
		this.products = products;
		this.today = today;
	}

	@Transactional
	public MoveToFridgeResponse move(UUID householdId, UUID userId, MoveToFridgeRequest request) {
		List<MoveToFridgeRequest.Item> requested = request == null || request.items() == null ? allBought(householdId)
				: request.items();
		validate(request, requested);

		var date = today.date();
		List<ProductResponse> created = new ArrayList<>();
		for (int i = 0; i < requested.size(); i++) {
			var entry = requested.get(i);
			var item = shopping.find(householdId, entry.id());
			if (!item.isBought()) {
				throw new ItemNotBoughtException();
			}
			try {
				created.add(products.create(householdId, userId, toProduct(item, entry, date)));
			}
			catch (ValidationException ex) {
				// Помилку поля продукту (напр. термін раніше за сьогодні) прив'язуємо до рядка підтвердження
				Map<String, String> errors = new LinkedHashMap<>();
				int index = i;
				ex.fieldErrors().forEach((field, code) -> errors.put("items[" + index + "]." + field, code));
				throw new ValidationException(errors);
			}
			items.delete(item);
		}
		return new MoveToFridgeResponse(created.size(), created);
	}

	static ProductInput toProduct(ShoppingItem item, MoveToFridgeRequest.Item entry, LocalDate today) {
		ProductCategory category = entry.category() != null ? entry.category()
				: item.getCategory() != null ? item.getCategory() : ProductCategory.OTHER;
		var input = new ProductInput();
		input.setName(item.getName());
		input.setCategory(category);
		if (entry.zone() != null) {
			input.setZone(entry.zone());
		}
		// «Хліб» без кількості — одна штука
		input.setQuantity(item.getQuantity() != null ? item.getQuantity() : BigDecimal.ONE);
		input.setUnit(item.getUnit() != null ? item.getUnit() : Unit.PIECES);
		input.setPurchasedAt(today);
		input.setExpiresAt(entry.expiresAt() != null ? entry.expiresAt()
				: today.plusDays(Dictionaries.defaultShelfLifeDays(category)));
		return input;
	}

	private List<MoveToFridgeRequest.Item> allBought(UUID householdId) {
		return items.findByHouseholdId(householdId)
			.stream()
			.filter(ShoppingItem::isBought)
			.sorted(ShoppingListService.BOUGHT)
			.map(i -> new MoveToFridgeRequest.Item(i.getId(), null, null, null))
			.toList();
	}

	private static void validate(MoveToFridgeRequest request, List<MoveToFridgeRequest.Item> requested) {
		Map<String, String> errors = new LinkedHashMap<>();
		if (request != null && request.items() != null && request.items().isEmpty()) {
			errors.put("items", "NotEmpty");
		}
		var seen = new HashSet<UUID>();
		for (int i = 0; i < requested.size(); i++) {
			var id = requested.get(i).id();
			if (id == null) {
				errors.put("items[" + i + "].id", "NotNull");
			}
			else if (!seen.add(id)) {
				errors.put("items[" + i + "].id", "DUPLICATE");
			}
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
	}

}
