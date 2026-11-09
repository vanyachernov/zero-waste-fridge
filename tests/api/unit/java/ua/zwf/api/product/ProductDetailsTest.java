package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import ua.zwf.api.household.Household;

class ProductDetailsTest {

	static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

	static ProductDetails yogurt() {
		return new ProductDetails("Грецький йогурт 5%", "ТМ Галичина", ProductCategory.DAIRY, StorageZone.DOOR,
				new BigDecimal("350"), Unit.GRAMS, TODAY.minusDays(1), TODAY.plusDays(10), 2);
	}

	@Test
	void normalizesWhitespaceAndBlankBrand() {
		var details = new ProductDetails("  Грецький \t  йогурт ", "   ", ProductCategory.DAIRY, StorageZone.DOOR,
				BigDecimal.ONE, Unit.PIECES, null, TODAY, 1);

		assertThat(details.name()).isEqualTo("Грецький йогурт");
		assertThat(details.brand()).isNull();
	}

	@Test
	void rejectsWhatTheDatabaseRejects() {
		var base = yogurt();
		assertThatThrownBy(() -> new ProductDetails(" ", null, base.category(), base.zone(), base.quantity(),
				base.unit(), null, base.expiresAt(), 2))
			.hasMessageContaining("name");
		assertThatThrownBy(() -> new ProductDetails("x".repeat(121), null, base.category(), base.zone(),
				base.quantity(), base.unit(), null, base.expiresAt(), 2))
			.hasMessageContaining("name");
		assertThatThrownBy(() -> new ProductDetails("Молоко", "b".repeat(121), base.category(), base.zone(),
				base.quantity(), base.unit(), null, base.expiresAt(), 2))
			.hasMessageContaining("brand");
		assertThatThrownBy(() -> new ProductDetails("Молоко", null, base.category(), base.zone(), BigDecimal.ZERO,
				base.unit(), null, base.expiresAt(), 2))
			.hasMessageContaining("quantity");
		assertThatThrownBy(() -> new ProductDetails("Молоко", null, base.category(), base.zone(), BigDecimal.ONE,
				base.unit(), null, base.expiresAt(), 5))
			.hasMessageContaining("remindBeforeDays");
		assertThatThrownBy(() -> new ProductDetails("Молоко", null, base.category(), base.zone(), BigDecimal.ONE,
				base.unit(), TODAY, TODAY.minusDays(1), 2))
			.hasMessageContaining("expiresAt");
		assertThatThrownBy(() -> new ProductDetails("Молоко", null, null, base.zone(), BigDecimal.ONE, base.unit(),
				null, TODAY, 2))
			.isInstanceOf(NullPointerException.class);
	}

	@Test
	void newProductIsActiveAndEffectiveExpiryEqualsLabelDate() {
		var now = Instant.parse("2026-11-09T10:00:00Z");
		var product = new Product(new Household("Сім'я", now), null, yogurt(), now);

		assertThat(product.getStatus()).isEqualTo(ProductStatus.ACTIVE);
		assertThat(product.isActive()).isTrue();
		assertThat(product.getEffectiveExpiresAt()).isEqualTo(TODAY.plusDays(10));
		assertThat(product.getCreatedAt()).isEqualTo(now);
		assertThat(product.getUpdatedAt()).isEqualTo(now);
		assertThat(product.getClosedAt()).isNull();
		assertThat(product.details()).isEqualTo(yogurt());
	}

	@Test
	void applyReplacesEditableFields() {
		var created = Instant.parse("2026-11-09T10:00:00Z");
		var product = new Product(new Household("Сім'я", created), null, yogurt(), created);
		var later = created.plusSeconds(60);
		var changed = new ProductDetails("Йогурт", null, ProductCategory.DAIRY, StorageZone.MIDDLE, new BigDecimal("200"),
				Unit.GRAMS, null, TODAY.plusDays(3), 1);

		product.apply(changed, later);

		assertThat(product.details()).isEqualTo(changed);
		assertThat(product.getEffectiveExpiresAt()).isEqualTo(TODAY.plusDays(3));
		assertThat(product.getCreatedAt()).isEqualTo(created);
		assertThat(product.getUpdatedAt()).isEqualTo(later);
	}

}
