package ua.zwf.api.product;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.dictionary.Dictionaries;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.user.UserRepository;

/** B-11: продукти холодильника. Усі операції — лише в межах домогосподарства поточного користувача. */
@Service
public class ProductService {

	public static final int MAX_PAGE_SIZE = 100;

	private final ProductRepository products;

	private final HouseholdRepository households;

	private final UserRepository users;

	private final EntityManager em;

	private final Clock clock;

	private final Today today;

	public ProductService(ProductRepository products, HouseholdRepository households, UserRepository users,
			EntityManager em, Clock clock, Today today) {
		this.products = products;
		this.households = households;
		this.users = users;
		this.em = em;
		this.clock = clock;
		this.today = today;
	}

	@Transactional(readOnly = true)
	public ProductPage list(ProductFilter filter, ProductSort sort, int page, int size) {
		Map<String, String> errors = new LinkedHashMap<>();
		if (page < 1) {
			errors.put("page", "Min");
		}
		if (size < 1 || size > MAX_PAGE_SIZE) {
			errors.put("size", "Range");
		}
		if (!errors.isEmpty()) {
			throw new ValidationException(errors);
		}
		LocalDate date = today.date();
		var result = products.findAll(filter.toSpecification(date), PageRequest.of(page - 1, size, sort.toSort()));
		var items = result.getContent().stream().map(p -> ProductResponse.of(p, date)).toList();
		return new ProductPage(items, page, size, result.getTotalElements(), result.getTotalPages(),
				categoryCounts(filter, date));
	}

	@Transactional(readOnly = true)
	public ProductResponse get(UUID householdId, UUID productId) {
		return ProductResponse.of(find(householdId, productId), today.date());
	}

	@Transactional
	public ProductResponse create(UUID householdId, UUID userId, ProductInput input) {
		LocalDate date = today.date();
		var category = input.getCategory();
		var values = new Values(input.getName(), input.getBrand(), category,
				input.getZone() != null || category == null ? input.getZone() : Dictionaries.defaultZone(category),
				input.getQuantity(), input.getUnit(), input.getPurchasedAt(), input.getExpiresAt(), input.getOpenedAt(),
				input.getRemindBeforeDays() == null ? ReminderLead.DEFAULT_DAYS : input.getRemindBeforeDays());
		var details = values.validate(date);

		var product = new Product(households.getReferenceById(householdId), users.getReferenceById(userId), details,
				clock.instant());
		if (values.openedAt() != null) {
			product.open(values.openedAt(), OpenedShelfLife.days(details.category(), details.name()), clock.instant());
		}
		products.saveAndFlush(product);
		return ProductResponse.of(products.findByIdAndHouseholdId(product.getId(), householdId).orElseThrow(), date);
	}

	@Transactional
	public ProductResponse update(UUID householdId, UUID productId, ProductInput input) {
		var product = find(householdId, productId);
		if (!product.isActive()) {
			throw new ProductClosedException();
		}
		LocalDate date = today.date();
		var current = product.details();
		var values = new Values(
				input.has("name") ? input.getName() : current.name(),
				input.has("brand") ? input.getBrand() : current.brand(),
				input.has("category") ? input.getCategory() : current.category(),
				input.has("zone") ? input.getZone() : current.zone(),
				input.has("quantity") ? input.getQuantity() : current.quantity(),
				input.has("unit") ? input.getUnit() : current.unit(),
				input.has("purchasedAt") ? input.getPurchasedAt() : current.purchasedAt(),
				input.has("expiresAt") ? input.getExpiresAt() : current.expiresAt(),
				input.has("openedAt") ? input.getOpenedAt() : product.getOpenedAt(),
				input.has("remindBeforeDays") ? input.getRemindBeforeDays() : current.remindBeforeDays());
		var details = values.validate(date);

		var now = clock.instant();
		boolean openedChanged = input.has("openedAt") && !java.util.Objects.equals(values.openedAt(), product.getOpenedAt());
		if (openedChanged) {
			// Спершу знімаємо стару позначку: нова дата покупки могла б конфліктувати зі старою датою відкриття
			product.unopen(now);
		}
		product.apply(details, now);
		if (openedChanged && values.openedAt() != null) {
			product.open(values.openedAt(), OpenedShelfLife.days(details.category(), details.name()), now);
		}
		products.flush();
		return ProductResponse.of(product, date);
	}

	Product find(UUID householdId, UUID productId) {
		return products.findByIdAndHouseholdId(productId, householdId).orElseThrow(ProductNotFoundException::new);
	}

	private Map<String, Long> categoryCounts(ProductFilter filter, LocalDate date) {
		var cb = em.getCriteriaBuilder();
		var cq = cb.createTupleQuery();
		var root = cq.from(Product.class);
		cq.multiselect(root.get("category"), cb.count(root))
			.where(filter.predicates(root, cb, date, false).toArray(jakarta.persistence.criteria.Predicate[]::new))
			.groupBy(root.get("category"));
		Map<String, Long> counts = new LinkedHashMap<>();
		for (ProductCategory category : ProductCategory.values()) {
			counts.put(category.code(), 0L);
		}
		for (Tuple row : em.createQuery(cq).getResultList()) {
			counts.put(row.get(0, ProductCategory.class).code(), row.get(1, Long.class));
		}
		return counts;
	}

	/** Значення після злиття запиту з поточним станом; перевіряє їх і повертає помилки полів разом. */
	record Values(String name, String brand, ProductCategory category, StorageZone zone, BigDecimal quantity,
			Unit unit, LocalDate purchasedAt, LocalDate expiresAt, LocalDate openedAt, Integer remindBeforeDays) {

		static final int QUANTITY_INTEGER_DIGITS = 7;

		static final int QUANTITY_FRACTION_DIGITS = 3;

		ProductDetails validate(LocalDate today) {
			Map<String, String> errors = new LinkedHashMap<>();
			String normalizedName = name == null ? null : ProductDetails.collapse(name);
			if (normalizedName == null) {
				errors.put("name", "NotNull");
			}
			else if (normalizedName.isEmpty()) {
				errors.put("name", "NotBlank");
			}
			else if (normalizedName.length() > Product.NAME_MAX) {
				errors.put("name", "Size");
			}
			if (brand != null && ProductDetails.collapse(brand).length() > Product.BRAND_MAX) {
				errors.put("brand", "Size");
			}
			required(errors, "category", category);
			required(errors, "zone", zone);
			required(errors, "unit", unit);
			required(errors, "expiresAt", expiresAt);
			if (quantity == null) {
				errors.put("quantity", "NotNull");
			}
			else if (quantity.signum() <= 0) {
				errors.put("quantity", "Positive");
			}
			else if (quantity.stripTrailingZeros().scale() > QUANTITY_FRACTION_DIGITS
					|| quantity.precision() - quantity.scale() > QUANTITY_INTEGER_DIGITS) {
				errors.put("quantity", "Digits");
			}
			if (remindBeforeDays == null) {
				errors.put("remindBeforeDays", "NotNull");
			}
			else if (!ReminderLead.isAllowed(remindBeforeDays)) {
				errors.put("remindBeforeDays", "NOT_ALLOWED");
			}
			if (purchasedAt != null && purchasedAt.isAfter(today)) {
				errors.put("purchasedAt", "IN_FUTURE");
			}
			if (expiresAt != null && purchasedAt != null && expiresAt.isBefore(purchasedAt)) {
				errors.put("expiresAt", "BEFORE_PURCHASE");
			}
			if (openedAt != null && openedAt.isAfter(today)) {
				errors.put("openedAt", "IN_FUTURE");
			}
			else if (openedAt != null && purchasedAt != null && openedAt.isBefore(purchasedAt)) {
				errors.put("openedAt", "BEFORE_PURCHASE");
			}
			if (!errors.isEmpty()) {
				throw new ValidationException(errors);
			}
			return new ProductDetails(name, brand, category, zone, quantity, unit, purchasedAt, expiresAt,
					remindBeforeDays);
		}

		private static void required(Map<String, String> errors, String field, Object value) {
			if (value == null) {
				errors.put(field, "NotNull");
			}
		}

	}

}
