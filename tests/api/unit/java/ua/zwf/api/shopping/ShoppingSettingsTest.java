package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.EnumSet;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.product.ProductCategory;

class ShoppingSettingsTest {

	@Test
	void defaultRefillsEverything() {
		var settings = new ShoppingSettings(UUID.randomUUID());

		assertThat(settings.isAutoRefill()).isTrue();
		assertThat(settings.excluded()).isEmpty();
		for (ProductCategory category : ProductCategory.values()) {
			assertThat(settings.refills(category)).isTrue();
		}
	}

	@Test
	void exclusionsAndSwitchOff() {
		var settings = new ShoppingSettings(UUID.randomUUID());

		settings.update(true, EnumSet.of(ProductCategory.SAUCES, ProductCategory.DAIRY), Instant.EPOCH);
		assertThat(settings.excluded()).containsExactly(ProductCategory.DAIRY, ProductCategory.SAUCES);
		assertThat(settings.refills(ProductCategory.DAIRY)).isFalse();
		assertThat(settings.refills(ProductCategory.MEAT)).isTrue();

		settings.update(false, EnumSet.noneOf(ProductCategory.class), Instant.EPOCH);
		assertThat(settings.excluded()).isEmpty();
		assertThat(settings.refills(ProductCategory.MEAT)).isFalse();
	}

}
