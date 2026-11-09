package ua.zwf.api.shopping;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;
import ua.zwf.api.product.WriteOffListener;
import ua.zwf.api.product.WriteOffOutcome;
import ua.zwf.api.user.UserRepository;

/** B-40: спільний список покупок домогосподарства. */
@Service
public class ShoppingListService implements WriteOffListener {

	static final Comparator<ShoppingItem> TO_BUY = Comparator
		.comparing((ShoppingItem i) -> i.getPriority() == ShoppingPriority.HIGH ? 0 : 1)
		.thenComparing(ShoppingItem::getCreatedAt)
		.thenComparing(i -> i.getId().toString());

	static final Comparator<ShoppingItem> BOUGHT = Comparator.comparing(ShoppingItem::getBoughtAt)
		.reversed()
		.thenComparing(i -> i.getId().toString());

	private final ShoppingItemRepository items;

	private final HouseholdRepository households;

	private final UserRepository users;

	private final Clock clock;

	public ShoppingListService(ShoppingItemRepository items, HouseholdRepository households, UserRepository users,
			Clock clock) {
		this.items = items;
		this.households = households;
		this.users = users;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public ShoppingListResponse list(UUID householdId) {
		var all = items.findByHouseholdId(householdId);
		var toBuy = all.stream().filter(i -> !i.isBought()).sorted(TO_BUY).map(ShoppingItemResponse::of).toList();
		var bought = all.stream().filter(ShoppingItem::isBought).sorted(BOUGHT).map(ShoppingItemResponse::of).toList();
		return new ShoppingListResponse(toBuy, bought);
	}

	@Transactional
	public ShoppingItemResponse create(UUID householdId, UUID userId, ShoppingItemInput input) {
		var details = new Values(input.getName(), input.getQuantity(), input.getUnit(), input.getCategory(),
				input.getPriority(), input.getPriceEstimate()).validate();
		var item = items.save(new ShoppingItem(households.getReferenceById(householdId), users.getReferenceById(userId),
				ShoppingSource.MANUAL, null, details, clock.instant()));
		items.flush();
		return ShoppingItemResponse.of(find(householdId, item.getId()));
	}

	@Transactional
	public ShoppingItemResponse update(UUID householdId, UUID itemId, ShoppingItemInput input) {
		var item = find(householdId, itemId);
		var current = item.details();
		var details = new Values(
				input.has("name") ? input.getName() : current.name(),
				input.has("quantity") ? input.getQuantity() : current.quantity(),
				input.has("unit") ? input.getUnit() : current.unit(),
				input.has("category") ? input.getCategory() : current.category(),
				input.has("priority") ? input.getPriority() : current.priority(),
				input.has("priceEstimate") ? input.getPriceEstimate() : current.priceEstimate()).validate();
		item.apply(details, clock.instant());
		items.flush();
		return ShoppingItemResponse.of(item);
	}

	@Transactional
	public void delete(UUID householdId, UUID itemId) {
		items.delete(find(householdId, itemId));
	}

	@Transactional
	public ShoppingItemResponse toggle(UUID householdId, UUID userId, UUID itemId) {
		var item = find(householdId, itemId);
		item.toggle(users.getReferenceById(userId), clock.instant());
		items.flush();
		return ShoppingItemResponse.of(find(householdId, itemId));
	}

	/** B-13: «Додати … до списку покупок» у модалці списання. */
	@Override
	@Transactional
	public boolean afterWriteOff(Product product, UUID userId, WriteOffOutcome outcome, BigDecimal written,
			boolean requested) {
		if (!requested) {
			return false;
		}
		addFromProduct(product, userId, ShoppingSource.WRITE_OFF, written);
		return true;
	}

	/** Позиція «купити ще раз» за продуктом; якщо така назва вже чекає на покупку — не дублюємо. */
	ShoppingItem addFromProduct(Product product, UUID userId, ShoppingSource source, BigDecimal quantity) {
		var householdId = product.getHousehold().getId();
		var existing = items.findOpenByName(householdId, product.getName());
		if (!existing.isEmpty()) {
			return existing.getFirst();
		}
		var details = new ShoppingItemDetails(product.getName(), quantity, quantity == null ? null : product.getUnit(),
				product.getCategory(), ShoppingPriority.NORMAL, null);
		return items.save(new ShoppingItem(product.getHousehold(), userId == null ? null : users.getReferenceById(userId),
				source, product, details, clock.instant()));
	}

	ShoppingItem find(UUID householdId, UUID itemId) {
		return items.findByIdAndHouseholdId(itemId, householdId).orElseThrow(ShoppingItemNotFoundException::new);
	}

	/** Значення після злиття; помилки полів у тих самих кодах, що й у продуктів. */
	record Values(String name, BigDecimal quantity, Unit unit, ProductCategory category, ShoppingPriority priority,
			BigDecimal priceEstimate) {

		ShoppingItemDetails validate() {
			Map<String, String> errors = new LinkedHashMap<>();
			String normalized = name == null ? null : name.strip().replaceAll("\\s+", " ");
			if (normalized == null) {
				errors.put("name", "NotNull");
			}
			else if (normalized.isEmpty()) {
				errors.put("name", "NotBlank");
			}
			else if (normalized.length() > ShoppingItem.NAME_MAX) {
				errors.put("name", "Size");
			}
			if (quantity != null) {
				if (quantity.signum() <= 0) {
					errors.put("quantity", "Positive");
				}
				else if (quantity.stripTrailingZeros().scale() > 3 || quantity.precision() - quantity.scale() > 7) {
					errors.put("quantity", "Digits");
				}
				else if (unit == null) {
					errors.put("unit", "NotNull");
				}
			}
			else if (unit != null) {
				errors.put("quantity", "NotNull");
			}
			if (priceEstimate != null) {
				if (priceEstimate.signum() < 0) {
					errors.put("priceEstimate", "PositiveOrZero");
				}
				else if (priceEstimate.stripTrailingZeros().scale() > 2
						|| priceEstimate.precision() - priceEstimate.scale() > 8) {
					errors.put("priceEstimate", "Digits");
				}
			}
			if (!errors.isEmpty()) {
				throw new ValidationException(errors);
			}
			return new ShoppingItemDetails(name, quantity, unit, category, priority, priceEstimate);
		}

	}

}
