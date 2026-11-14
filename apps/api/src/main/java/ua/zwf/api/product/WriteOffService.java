package ua.zwf.api.product;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.user.UserRepository;

/** B-13: списання продукту — з'їдено, використано в рецепті або викинуто; повністю чи частково. */
@Service
public class WriteOffService {

	private final ProductService products;

	private final ProductEventRepository events;

	private final UserRepository users;

	private final Clock clock;

	private final Today today;

	private final WriteOffListener listener;

	public WriteOffService(ProductService products, ProductEventRepository events, UserRepository users, Clock clock,
			Today today, WriteOffListener listener) {
		this.listener = listener;
		this.products = products;
		this.events = events;
		this.users = users;
		this.clock = clock;
		this.today = today;
	}

	@Transactional
	public WriteOffResponse writeOff(UUID householdId, UUID userId, UUID productId, WriteOffRequest request) {
		var product = products.find(householdId, productId);
		if (!product.isActive()) {
			throw new ProductClosedException();
		}
		BigDecimal amount = validate(request, product.getQuantity());
		var now = clock.instant();

		BigDecimal written = product.writeOff(request.outcome(), amount, now);
		events.save(ProductEvent.writtenOff(product, users.getReferenceById(userId), request.outcome(), written, now));

		boolean inShoppingList = listener.afterWriteOff(product, userId, request.outcome(), written,
				Boolean.TRUE.equals(request.addToShoppingList()));

		var writtenOff = new WriteOffResponse.WrittenOff(request.outcome(), ProductResponse.plain(written),
				product.getUnit(), !product.isActive());
		return new WriteOffResponse(ProductResponse.of(product, today.date()), writtenOff, inShoppingList);
	}

	/** {@code null} — списати все. */
	static BigDecimal validate(WriteOffRequest request, BigDecimal remaining) {
		Map<String, String> errors = new LinkedHashMap<>();
		if (request == null || request.outcome() == null) {
			errors.put("outcome", "NotNull");
		}
		BigDecimal amount = null;
		Object raw = request == null ? null : request.quantity();
		if (raw instanceof Number number) {
			amount = new BigDecimal(number.toString());
			if (amount.signum() <= 0) {
				errors.put("quantity", "Positive");
			}
			else if (amount.stripTrailingZeros().scale() > ProductService.Values.QUANTITY_FRACTION_DIGITS) {
				errors.put("quantity", "Digits");
			}
			else if (amount.compareTo(remaining) > 0) {
				errors.put("quantity", "EXCEEDS_REMAINING");
			}
			else if (amount.compareTo(remaining) == 0) {
				amount = null;
			}
		}
		else if (raw != null && !(raw instanceof String s && WriteOffRequest.ALL.equalsIgnoreCase(s.strip()))) {
			errors.put("quantity", "INVALID");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		return amount;
	}

}
