package ua.zwf.api.tip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import ua.zwf.api.common.Today;
import ua.zwf.api.household.Household;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductDetails;
import ua.zwf.api.product.ProductRepository;
import ua.zwf.api.product.StorageZone;
import ua.zwf.api.product.Unit;

class TipServiceTest {

	static final Instant NOW = Instant.parse("2026-11-09T10:00:00Z");

	static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

	final ProductRepository repository = mock(ProductRepository.class);

	final TipService service = new TipService(repository,
			new Today(Clock.fixed(NOW, ZoneId.of("UTC")), ZoneId.of("Europe/Kyiv")));

	static Product product(String name, ProductCategory category, int daysLeft) {
		return new Product(new Household("Сім'я", NOW), null, new ProductDetails(name, null, category,
				StorageZone.MIDDLE, BigDecimal.ONE, Unit.PIECES, null, TODAY.plusDays(daysLeft), 2), NOW);
	}

	@SuppressWarnings("unchecked")
	TipResponse tipFor(Product... products) {
		when(repository.findAll(any(Specification.class), any(Sort.class))).thenReturn(Arrays.asList(products));
		return service.today(UUID.randomUUID());
	}

	@Test
	void productsExpiringTodayOrTomorrowWithDishForDominantCategory() {
		var tip = tipFor(product("Фарш", ProductCategory.MEAT, -1), product("Шпинат", ProductCategory.VEGETABLES, 0),
				product("Йогурт", ProductCategory.DAIRY, 1), product("Салат", ProductCategory.VEGETABLES, 1),
				product("Сир", ProductCategory.DAIRY, 2));

		assertThat(tip.date()).isEqualTo(TODAY);
		assertThat(tip.kind()).isEqualTo(TipKind.USE_SOON);
		assertThat(tip.products()).extracting(TipResponse.TipProduct::name).containsExactly("Шпинат", "Йогурт", "Салат");
		assertThat(tip.products()).extracting(TipResponse.TipProduct::daysLeft).containsExactly(0L, 1L, 1L);
		assertThat(tip.hint()).isEqualTo(RecipeHint.SALAD);
	}

	@Test
	void showsAtMostFourProducts() {
		var tip = tipFor(product("1", ProductCategory.FRUITS, 0), product("2", ProductCategory.FRUITS, 0),
				product("3", ProductCategory.FRUITS, 1), product("4", ProductCategory.FRUITS, 1),
				product("5", ProductCategory.FRUITS, 1));

		assertThat(tip.products()).hasSize(TipService.MAX_PRODUCTS);
		assertThat(tip.hint()).isEqualTo(RecipeHint.SMOOTHIE);
	}

	@Test
	void tieGoesToTheMostUrgentProductsCategory() {
		assertThat(TipService.dominant(List.of(product("Молоко", ProductCategory.DAIRY, 0),
				product("Фарш", ProductCategory.MEAT, 0), product("Курка", ProductCategory.MEAT, 1),
				product("Сир", ProductCategory.DAIRY, 1))))
			.isEqualTo(ProductCategory.DAIRY);
	}

	@Test
	void expiredWhenNothingUrgent() {
		var tip = tipFor(product("Фарш", ProductCategory.MEAT, -2), product("Сир", ProductCategory.DAIRY, 5));

		assertThat(tip.kind()).isEqualTo(TipKind.EXPIRED);
		assertThat(tip.products()).extracting(TipResponse.TipProduct::name).containsExactly("Фарш");
		assertThat(tip.hint()).isNull();
	}

	@Test
	void allFreshOrEmpty() {
		assertThat(tipFor(product("Сир", ProductCategory.DAIRY, 5)).kind()).isEqualTo(TipKind.ALL_FRESH);
		assertThat(tipFor().kind()).isEqualTo(TipKind.EMPTY);
		assertThat(tipFor().products()).isEmpty();
	}

	@Test
	void everyCategoryHasADishIdea() {
		assertThat(Arrays.stream(ProductCategory.values()).map(RecipeHint::forCategory)).doesNotContainNull();
	}

}
