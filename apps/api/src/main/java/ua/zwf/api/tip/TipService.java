package ua.zwf.api.tip;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.product.Freshness;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductFilter;
import ua.zwf.api.product.ProductRepository;

/**
 * B-15, перша версія — на шаблонах: беремо продукти, що закінчуються сьогодні або завтра (≤ 24 год до кінця
 * дня завтра), і пропонуємо страву за переважною категорією. Порада стабільна протягом дня.
 */
@Service
public class TipService {

	public static final int MAX_PRODUCTS = 4;

	private final ProductRepository products;

	private final Today today;

	public TipService(ProductRepository products, Today today) {
		this.products = products;
		this.today = today;
	}

	@Transactional(readOnly = true)
	public TipResponse today(UUID householdId) {
		var date = today.date();
		var sort = Sort.by("effectiveExpiresAt", "name", "id");
		var active = products.findAll(new ProductFilter(householdId, null, null, null, null).toSpecification(date), sort);

		List<Product> urgent = active.stream()
			.filter(p -> {
				long days = ChronoUnit.DAYS.between(date, p.getEffectiveExpiresAt());
				return days >= 0 && days <= 1;
			})
			.toList();
		if (!urgent.isEmpty()) {
			var shown = urgent.stream().limit(MAX_PRODUCTS).toList();
			return new TipResponse(date, TipKind.USE_SOON, view(shown, date), RecipeHint.forCategory(dominant(shown)));
		}
		var expired = active.stream().filter(p -> Freshness.of(daysLeft(p, date)) == Freshness.EXPIRED).toList();
		if (!expired.isEmpty()) {
			return new TipResponse(date, TipKind.EXPIRED, view(expired.stream().limit(MAX_PRODUCTS).toList(), date), null);
		}
		return new TipResponse(date, active.isEmpty() ? TipKind.EMPTY : TipKind.ALL_FRESH, List.of(), null);
	}

	/** Найчастіша категорія; за рівності — категорія найтерміновішого продукту. */
	static ProductCategory dominant(List<Product> products) {
		Map<ProductCategory, Long> counts = products.stream()
			.collect(Collectors.groupingBy(Product::getCategory, LinkedHashMap::new, Collectors.counting()));
		return counts.entrySet()
			.stream()
			.max(Comparator.comparingLong(Map.Entry<ProductCategory, Long>::getValue)
				.thenComparing(e -> -indexOf(products, e.getKey())))
			.map(Map.Entry::getKey)
			.orElseThrow();
	}

	private static int indexOf(List<Product> products, ProductCategory category) {
		for (int i = 0; i < products.size(); i++) {
			if (products.get(i).getCategory() == category) {
				return i;
			}
		}
		return Integer.MAX_VALUE;
	}

	private static long daysLeft(Product p, LocalDate date) {
		return ChronoUnit.DAYS.between(date, p.getEffectiveExpiresAt());
	}

	private static List<TipResponse.TipProduct> view(List<Product> products, LocalDate date) {
		Function<Product, TipResponse.TipProduct> toView = p -> new TipResponse.TipProduct(p.getId(), p.getName(),
				p.getCategory(), daysLeft(p, date));
		return products.stream().map(toView).toList();
	}

}
