package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import ua.zwf.api.household.Household;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.StorageZone;
import ua.zwf.api.product.Unit;

class MoveToFridgeTest {

	static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

	static ShoppingItem item(BigDecimal quantity, Unit unit, ProductCategory category) {
		return new ShoppingItem(new Household("Сім'я", Instant.EPOCH), null, ShoppingSource.MANUAL, null,
				new ShoppingItemDetails("Сир", quantity, unit, category, null, null), Instant.EPOCH);
	}

	@Test
	void defaultsFromCategoryAndOnePiece() {
		var input = MoveToFridgeService.toProduct(item(null, null, null),
				new MoveToFridgeRequest.Item(null, null, null, null), TODAY);

		assertThat(input.getCategory()).isEqualTo(ProductCategory.OTHER);
		assertThat(input.getQuantity()).isEqualByComparingTo("1");
		assertThat(input.getUnit()).isEqualTo(Unit.PIECES);
		assertThat(input.getPurchasedAt()).isEqualTo(TODAY);
		assertThat(input.getExpiresAt()).isEqualTo(TODAY.plusDays(14));
		assertThat(input.has("zone")).as("zone left to the category default").isFalse();
	}

	@Test
	void keepsItemValuesAndAppliesCorrections() {
		var input = MoveToFridgeService.toProduct(item(new BigDecimal("0.5"), Unit.KILOGRAMS, ProductCategory.DAIRY),
				new MoveToFridgeRequest.Item(null, TODAY.plusDays(30), StorageZone.FREEZER, ProductCategory.MEAT), TODAY);

		assertThat(input.getCategory()).isEqualTo(ProductCategory.MEAT);
		assertThat(input.getZone()).isEqualTo(StorageZone.FREEZER);
		assertThat(input.getQuantity()).isEqualByComparingTo("0.5");
		assertThat(input.getUnit()).isEqualTo(Unit.KILOGRAMS);
		assertThat(input.getExpiresAt()).isEqualTo(TODAY.plusDays(30));
	}

	@Test
	void categoryFromItemWhenNotCorrected() {
		var input = MoveToFridgeService.toProduct(item(null, null, ProductCategory.DAIRY),
				new MoveToFridgeRequest.Item(null, null, null, null), TODAY);

		assertThat(input.getExpiresAt()).isEqualTo(TODAY.plusDays(7));
	}

}
