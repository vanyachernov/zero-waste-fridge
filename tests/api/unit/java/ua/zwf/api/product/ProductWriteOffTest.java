package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.Household;

/** B-13: списання в домені та перевірка тіла запиту. */
class ProductWriteOffTest {

	static final Instant NOW = Instant.parse("2026-11-09T10:00:00Z");

	static Product yogurt() {
		return new Product(new Household("Сім'я", NOW), null, new ProductDetails("Йогурт", null, ProductCategory.DAIRY,
				StorageZone.DOOR, new BigDecimal("350"), Unit.GRAMS, null, LocalDate.of(2026, 11, 12), 2), NOW);
	}

	@Test
	void partialWriteOffKeepsProductActive() {
		var product = yogurt();

		var written = product.writeOff(WriteOffOutcome.EATEN, new BigDecimal("100"), NOW.plusSeconds(1));

		assertThat(written).isEqualByComparingTo("100");
		assertThat(product.getQuantity()).isEqualByComparingTo("250");
		assertThat(product.isActive()).isTrue();
		assertThat(product.getClosedAt()).isNull();
		assertThat(product.getUpdatedAt()).isEqualTo(NOW.plusSeconds(1));
	}

	@Test
	void writingOffEverythingClosesWithStatusByOutcome() {
		var eaten = yogurt();
		assertThat(eaten.writeOff(WriteOffOutcome.EATEN, null, NOW)).isEqualByComparingTo("350");
		assertThat(eaten.getStatus()).isEqualTo(ProductStatus.CONSUMED);
		assertThat(eaten.getClosedAt()).isEqualTo(NOW);
		assertThat(eaten.getQuantity()).as("closed product keeps the written amount").isEqualByComparingTo("350");

		var cooked = yogurt();
		cooked.writeOff(WriteOffOutcome.COOKED, new BigDecimal("350"), NOW);
		assertThat(cooked.getStatus()).isEqualTo(ProductStatus.CONSUMED);

		var wasted = yogurt();
		wasted.writeOff(WriteOffOutcome.WASTED, null, NOW);
		assertThat(wasted.getStatus()).isEqualTo(ProductStatus.WASTED);
	}

	@Test
	void domainRejectsInvalidWriteOffs() {
		var product = yogurt();
		assertThatThrownBy(() -> product.writeOff(WriteOffOutcome.EATEN, new BigDecimal("351"), NOW))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> product.writeOff(WriteOffOutcome.EATEN, BigDecimal.ZERO, NOW))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> product.writeOff(null, null, NOW)).isInstanceOf(NullPointerException.class);

		product.writeOff(WriteOffOutcome.WASTED, null, NOW);
		assertThatThrownBy(() -> product.writeOff(WriteOffOutcome.EATEN, null, NOW))
			.isInstanceOf(IllegalStateException.class);
	}

	static Map<String, String> errors(WriteOffRequest request) {
		var ex = catchThrowableOfType(ValidationException.class,
				() -> WriteOffService.validate(request, new BigDecimal("350")));
		assertThat(ex).as("expected validation errors").isNotNull();
		return ex.fieldErrors();
	}

	@Test
	void requestQuantityIsAllOrPositiveNumberUpToRemaining() {
		assertThat(WriteOffService.validate(new WriteOffRequest(WriteOffOutcome.EATEN, null, false), BigDecimal.TEN))
			.isNull();
		assertThat(WriteOffService.validate(new WriteOffRequest(WriteOffOutcome.EATEN, " ALL ", false), BigDecimal.TEN))
			.isNull();
		assertThat(WriteOffService.validate(new WriteOffRequest(WriteOffOutcome.EATEN, 10, false), BigDecimal.TEN))
			.as("exactly the remaining amount is 'all'")
			.isNull();
		assertThat(WriteOffService.validate(new WriteOffRequest(WriteOffOutcome.EATEN, 2.5, false), BigDecimal.TEN))
			.isEqualByComparingTo("2.5");

		assertThat(errors(new WriteOffRequest(null, "half", false))).containsOnly(Map.entry("outcome", "NotNull"),
				Map.entry("quantity", "INVALID"));
		assertThat(errors(new WriteOffRequest(WriteOffOutcome.EATEN, 0, false))).containsOnly(
				Map.entry("quantity", "Positive"));
		assertThat(errors(new WriteOffRequest(WriteOffOutcome.EATEN, 0.0001, false))).containsOnly(
				Map.entry("quantity", "Digits"));
		assertThat(errors(new WriteOffRequest(WriteOffOutcome.EATEN, 400, false))).containsOnly(
				Map.entry("quantity", "EXCEEDS_REMAINING"));
		assertThat(errors(null)).containsOnly(Map.entry("outcome", "NotNull"));
	}

	@Test
	void eventFactoriesKeepWriteOffInvariant() {
		var product = yogurt();
		var event = ProductEvent.writtenOff(product, null, WriteOffOutcome.COOKED, new BigDecimal("100"), NOW);

		assertThat(event.getType()).isEqualTo(ProductEventType.WRITTEN_OFF);
		assertThat(event.getUnit()).isEqualTo(Unit.GRAMS);
		assertThat(ProductEvent.of(product, null, ProductEventType.ADDED, NOW).getOutcome()).isNull();
		assertThatThrownBy(() -> ProductEvent.of(product, null, ProductEventType.WRITTEN_OFF, NOW))
			.isInstanceOf(IllegalArgumentException.class);
	}

}
