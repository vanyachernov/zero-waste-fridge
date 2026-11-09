package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.Household;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;
import ua.zwf.api.user.User;

class ShoppingItemTest {

	static final Instant NOW = Instant.parse("2026-11-09T10:00:00.123456789Z");

	static ShoppingItem item(String name, ShoppingPriority priority, Instant created) {
		return new ShoppingItem(new Household("Сім'я", NOW), null, ShoppingSource.MANUAL, null,
				new ShoppingItemDetails(name, null, null, null, priority, null), created);
	}

	@Test
	void detailsNormalizeAndDefaultPriority() {
		var details = new ShoppingItemDetails("  Хліб   житній ", null, null, null, null, null);

		assertThat(details.name()).isEqualTo("Хліб житній");
		assertThat(details.priority()).isEqualTo(ShoppingPriority.NORMAL);
		assertThatThrownBy(() -> new ShoppingItemDetails("Молоко", BigDecimal.ONE, null, null, null, null))
			.hasMessageContaining("together");
		assertThatThrownBy(() -> new ShoppingItemDetails(" ", null, null, null, null, null)).hasMessageContaining("name");
		assertThatThrownBy(() -> new ShoppingItemDetails("Молоко", null, null, null, null, new BigDecimal("-1")))
			.hasMessageContaining("price");
	}

	@Test
	void toggleMarksAndUnmarksBought() {
		var item = item("Молоко", ShoppingPriority.NORMAL, NOW);
		var olena = new User("olena@example.com", "Олена", "{noop}x", NOW);

		item.toggle(olena, NOW.plusSeconds(60));
		assertThat(item.isBought()).isTrue();
		assertThat(item.getBoughtBy()).isSameAs(olena);
		assertThat(item.getBoughtAt()).isEqualTo(Instant.parse("2026-11-09T10:01:00.123456Z"));

		item.toggle(olena, NOW.plusSeconds(120));
		assertThat(item.isBought()).isFalse();
		assertThat(item.getBoughtBy()).isNull();
		assertThat(item.getUpdatedAt()).isEqualTo(Instant.parse("2026-11-09T10:02:00.123456Z"));
	}

	@Test
	void toBuyOrderIsHighPriorityFirstThenOldest() throws Exception {
		var newerHigh = withId(item("Яйця", ShoppingPriority.HIGH, NOW.plusSeconds(30)));
		var older = withId(item("Хліб", ShoppingPriority.NORMAL, NOW));
		var newer = withId(item("Сир", ShoppingPriority.NORMAL, NOW.plusSeconds(10)));
		var list = new ArrayList<>(List.of(newer, older, newerHigh));

		list.sort(ShoppingListService.TO_BUY);

		assertThat(list).extracting(ShoppingItem::getName).containsExactly("Яйця", "Хліб", "Сир");
	}

	static ShoppingItem withId(ShoppingItem item) throws Exception {
		var field = ShoppingItem.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(item, java.util.UUID.randomUUID());
		return item;
	}

	static Map<String, String> errors(ShoppingListService.Values values) {
		var ex = catchThrowableOfType(ValidationException.class, values::validate);
		assertThat(ex).as("expected validation errors").isNotNull();
		return ex.fieldErrors();
	}

	@Test
	void valuesValidationCodes() {
		assertThat(errors(new ShoppingListService.Values(null, null, null, null, null, null)))
			.containsOnly(Map.entry("name", "NotNull"));
		assertThat(errors(new ShoppingListService.Values(" ", BigDecimal.ZERO, Unit.PIECES, null, null,
				new BigDecimal("-5"))))
			.containsOnly(Map.entry("name", "NotBlank"), Map.entry("quantity", "Positive"),
					Map.entry("priceEstimate", "PositiveOrZero"));
		assertThat(errors(new ShoppingListService.Values("Молоко", BigDecimal.ONE, null, null, null, null)))
			.containsOnly(Map.entry("unit", "NotNull"));
		assertThat(errors(new ShoppingListService.Values("Молоко", null, Unit.LITERS, null, null, null)))
			.containsOnly(Map.entry("quantity", "NotNull"));
		assertThat(errors(new ShoppingListService.Values("Молоко", null, null, null, null, new BigDecimal("1.999"))))
			.containsOnly(Map.entry("priceEstimate", "Digits"));
		assertThat(errors(new ShoppingListService.Values("x".repeat(121), null, null, null, null, null)))
			.containsOnly(Map.entry("name", "Size"));

		var ok = new ShoppingListService.Values("Молоко", new BigDecimal("2"), Unit.LITERS, ProductCategory.DAIRY,
				ShoppingPriority.HIGH, new BigDecimal("74.50")).validate();
		assertThat(ok.priority()).isEqualTo(ShoppingPriority.HIGH);
	}

	@Test
	void amountsAreReturnedWithoutTrailingZeros() {
		assertThat(ShoppingItemResponse.plain(new BigDecimal("74.00"))).hasToString("74");
		assertThat(ShoppingItemResponse.plain(new BigDecimal("0.500"))).hasToString("0.5");
		assertThat(ShoppingItemResponse.plain(null)).isNull();
	}

}
