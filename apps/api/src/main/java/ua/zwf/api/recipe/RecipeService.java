package ua.zwf.api.recipe;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.product.ProductRepository;
import ua.zwf.api.product.ProductStatus;
import ua.zwf.api.product.WriteOffOutcome;
import ua.zwf.api.product.WriteOffRequest;
import ua.zwf.api.product.WriteOffService;
import ua.zwf.api.recipe.RecipeResponses.CookResult;
import ua.zwf.api.recipe.RecipeResponses.RecipeCard;
import ua.zwf.api.recipe.RecipeResponses.RecipeDetail;

/** B-21…B-23: рекомендації, генерація, деталі й «Приготувати і списати». */
@Service
public class RecipeService {

	public static final int MIN_SELECTED = 3;

	public static final int MAX_SELECTED = 4;

	public static final int MAX_PORTIONS = 12;

	/** Сортування рекомендацій (як у макеті: «критичні інгредієнти (спочатку найбільше)»). */
	public enum Sort {

		CRITICAL, MATCH, TIME, KCAL

	}

	public record GenerateRequest(List<UUID> productIds) {
	}

	public record CookRequest(Integer portions, List<UUID> productIds) {
	}

	private final RecipeRepository recipes;

	private final ProductRepository products;

	private final RecipeGenerator generator;

	private final WriteOffService writeOffs;

	private final Today today;

	private final Clock clock;

	public RecipeService(RecipeRepository recipes, ProductRepository products, RecipeGenerator generator,
			WriteOffService writeOffs, Today today, Clock clock) {
		this.recipes = recipes;
		this.products = products;
		this.generator = generator;
		this.writeOffs = writeOffs;
		this.today = today;
		this.clock = clock;
	}

	List<FridgeItem> fridge(UUID householdId) {
		var date = today.date();
		return products.findByHouseholdIdAndStatus(householdId, ProductStatus.ACTIVE)
			.stream()
			.map(p -> FridgeItem.of(p, ChronoUnit.DAYS.between(date, p.getEffectiveExpiresAt())))
			.toList();
	}

	/** B-21: каталог, у якому є хоч один продукт із холодильника; критичні — першими. */
	@Transactional(readOnly = true)
	public List<RecipeCard> recommended(UUID householdId, Sort sort, int limit) {
		var fridge = fridge(householdId);
		Comparator<RecipeMatch> order = switch (sort) {
			case CRITICAL -> Comparator.comparingInt(RecipeMatch::score).reversed();
			case MATCH -> Comparator.comparingInt(RecipeMatch::matchPercent).reversed().thenComparing(Comparator.comparingInt(RecipeMatch::score).reversed());
			case TIME -> Comparator.comparingInt((RecipeMatch m) -> m.recipe().getMinutes()).thenComparing(Comparator.comparingInt(RecipeMatch::score).reversed());
			case KCAL -> Comparator.comparingInt((RecipeMatch m) -> m.recipe().getKcal()).thenComparing(Comparator.comparingInt(RecipeMatch::score).reversed());
		};
		// Спершу найкращі за збігом, потім — потрібний порядок усередині цієї вибірки
		return recipes.findBySource(RecipeSource.CATALOG)
			.stream()
			.map(r -> RecipeMatcher.match(r, fridge))
			.filter(m -> !m.used().isEmpty())
			.sorted(Comparator.comparingInt(RecipeMatch::score).reversed().thenComparing(m -> m.recipe().getTitle()))
			.limit(Math.clamp(limit, 1, 24))
			.sorted(order.thenComparing(m -> m.recipe().getTitle()))
			.map(RecipeCard::of)
			.toList();
	}

	@Transactional(readOnly = true)
	public RecipeDetail detail(UUID householdId, UUID recipeId) {
		return RecipeDetail.of(RecipeMatcher.match(find(householdId, recipeId), fridge(householdId)));
	}

	/**
	 * B-22: AI (якщо налаштовано) — рецепт зберігається для сім'ї; інакше або при збої — найкращий рецепт каталогу з
	 * обраними продуктами.
	 */
	@Transactional
	public RecipeDetail generate(UUID householdId, GenerateRequest request) {
		var ids = request == null || request.productIds() == null ? List.<UUID>of()
				: List.copyOf(new LinkedHashSet<>(request.productIds()));
		if (ids.size() < MIN_SELECTED || ids.size() > MAX_SELECTED) {
			throw new ValidationException(Map.of("productIds", "Size"));
		}
		var fridge = fridge(householdId);
		var byId = new LinkedHashMap<UUID, FridgeItem>();
		fridge.forEach(p -> byId.put(p.id(), p));
		var selected = ids.stream().map(byId::get).toList();
		if (selected.stream().anyMatch(p -> p == null || p.daysLeft() < 0)) {
			throw new ValidationException(Map.of("productIds", "INVALID"));
		}

		var generated = generator.generate(selected);
		if (generated.isPresent()) {
			var recipe = recipes.save(Recipe.generated(householdId, generated.get(), clock.instant()));
			return RecipeDetail.of(RecipeMatcher.match(recipe, fridge));
		}
		return recipes.findBySource(RecipeSource.CATALOG)
			.stream()
			.map(r -> RecipeMatcher.match(r, fridge))
			.filter(m -> m.used().stream().anyMatch(u -> ids.contains(u.product().id())))
			.max(Comparator.comparingLong((RecipeMatch m) -> m.used().stream().filter(u -> ids.contains(u.product().id())).count())
				.thenComparingInt(RecipeMatch::score)
				.thenComparing(m -> m.recipe().getTitle(), Comparator.reverseOrder()))
			.map(RecipeDetail::of)
			.orElseThrow(NoRecipeException::new);
	}

	/**
	 * B-23: списати використане (outcome COOKED). Кількість — з рецепта, перерахована на порції й одиниці продукту;
	 * без кількості або з несумісними одиницями — продукт цілком. Усе в одній транзакції.
	 */
	@Transactional
	public CookResult cook(UUID householdId, UUID userId, UUID recipeId, CookRequest request) {
		var recipe = find(householdId, recipeId);
		int portions = request == null || request.portions() == null ? recipe.getServings() : request.portions();
		if (portions < 1 || portions > MAX_PORTIONS) {
			throw new ValidationException(Map.of("portions", "Range"));
		}
		var match = RecipeMatcher.match(recipe, fridge(householdId));
		var only = request == null || request.productIds() == null ? null : Set.copyOf(request.productIds());
		var used = match.used().stream().filter(u -> only == null || only.contains(u.product().id())).toList();
		if (used.isEmpty()) {
			throw new ValidationException(Map.of("productIds", "EMPTY"));
		}
		var cooked = used.stream().map(u -> {
			var product = u.product();
			BigDecimal amount = Quantities
				.convert(Quantities.scale(u.ingredient().getQuantity(), recipe.getServings(), portions),
						u.ingredient().getUnit(), product.unit())
				.filter(q -> q.signum() > 0 && q.compareTo(product.quantity()) < 0)
				.orElse(null);
			var result = writeOffs.writeOff(householdId, userId, product.id(),
					new WriteOffRequest(WriteOffOutcome.COOKED, amount, false));
			var written = result.writtenOff();
			return new CookResult.Cooked(product.id(), product.name(), written.quantity(), written.unit(),
					written.closed());
		}).toList();
		return new CookResult(recipe.getId(), portions, cooked);
	}

	private Recipe find(UUID householdId, UUID recipeId) {
		return recipes.findById(recipeId).filter(r -> r.visibleTo(householdId)).orElseThrow(RecipeNotFoundException::new);
	}

}
