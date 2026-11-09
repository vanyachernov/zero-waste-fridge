package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.common.ValidationException;

/** B-11: перевірка полів продукту з кодами помилок, які локалізує фронтенд. */
class ProductValuesTest {

	static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

	static ProductService.Values valid() {
		return new ProductService.Values("Молоко", null, ProductCategory.DAIRY, StorageZone.DOOR, BigDecimal.ONE,
				Unit.LITERS, TODAY.minusDays(1), TODAY.plusDays(5), null, 2);
	}

	static Map<String, String> errorsOf(ProductService.Values values) {
		var ex = catchThrowableOfType(ValidationException.class, () -> values.validate(TODAY));
		assertThat(ex).as("expected validation errors").isNotNull();
		assertThat(ex.code()).isEqualTo("VALIDATION_FAILED");
		return ex.fieldErrors();
	}

	@Test
	void validValuesBecomeDetails() {
		var details = valid().validate(TODAY);

		assertThat(details.name()).isEqualTo("Молоко");
		assertThat(details.remindBeforeDays()).isEqualTo(2);
	}

	@Test
	void reportsAllMissingFieldsAtOnce() {
		var errors = errorsOf(new ProductService.Values(null, null, null, null, null, null, null, null, null, null));

		assertThat(errors).containsOnly(Map.entry("name", "NotNull"), Map.entry("category", "NotNull"),
				Map.entry("zone", "NotNull"), Map.entry("unit", "NotNull"), Map.entry("expiresAt", "NotNull"),
				Map.entry("quantity", "NotNull"), Map.entry("remindBeforeDays", "NotNull"));
	}

	@Test
	void textLimits() {
		var v = valid();
		assertThat(errorsOf(new ProductService.Values("   ", "b".repeat(121), v.category(), v.zone(), v.quantity(),
				v.unit(), null, v.expiresAt(), null, 2)))
			.containsOnly(Map.entry("name", "NotBlank"), Map.entry("brand", "Size"));
		assertThat(errorsOf(new ProductService.Values("x".repeat(121), null, v.category(), v.zone(), v.quantity(),
				v.unit(), null, v.expiresAt(), null, 2)))
			.containsOnly(Map.entry("name", "Size"));
		// Пробіли не рахуються: 120 символів після нормалізації — ок
		new ProductService.Values("  " + "x".repeat(120) + "  ", null, v.category(), v.zone(), v.quantity(), v.unit(),
				null, v.expiresAt(), null, 2).validate(TODAY);
	}

	@Test
	void quantityRules() {
		var v = valid();
		assertThat(errorsOf(withQuantity(v, "0"))).containsOnly(Map.entry("quantity", "Positive"));
		assertThat(errorsOf(withQuantity(v, "-1"))).containsOnly(Map.entry("quantity", "Positive"));
		assertThat(errorsOf(withQuantity(v, "0.0001"))).containsOnly(Map.entry("quantity", "Digits"));
		assertThat(errorsOf(withQuantity(v, "12345678"))).containsOnly(Map.entry("quantity", "Digits"));
		withQuantity(v, "1234567.125").validate(TODAY);
		withQuantity(v, "1.5000").validate(TODAY);
	}

	@Test
	void reminderMustBeOneOfModalOptions() {
		var v = valid();
		assertThat(errorsOf(new ProductService.Values(v.name(), null, v.category(), v.zone(), v.quantity(), v.unit(),
				null, v.expiresAt(), null, 4)))
			.containsOnly(Map.entry("remindBeforeDays", "NOT_ALLOWED"));
	}

	@Test
	void dateRules() {
		var v = valid();
		assertThat(errorsOf(dates(v, TODAY.plusDays(1), TODAY.plusDays(5), null)))
			.containsOnly(Map.entry("purchasedAt", "IN_FUTURE"));
		assertThat(errorsOf(dates(v, TODAY, TODAY.minusDays(1), null)))
			.containsOnly(Map.entry("expiresAt", "BEFORE_PURCHASE"));
		assertThat(errorsOf(dates(v, TODAY.minusDays(2), TODAY.plusDays(5), TODAY.plusDays(1))))
			.containsOnly(Map.entry("openedAt", "IN_FUTURE"));
		assertThat(errorsOf(dates(v, TODAY.minusDays(2), TODAY.plusDays(5), TODAY.minusDays(3))))
			.containsOnly(Map.entry("openedAt", "BEFORE_PURCHASE"));
		// Вже прострочений продукт додати можна (знайшли в холодильнику)
		dates(v, null, TODAY.minusDays(3), TODAY).validate(TODAY);
	}

	static ProductService.Values withQuantity(ProductService.Values v, String quantity) {
		return new ProductService.Values(v.name(), v.brand(), v.category(), v.zone(), new BigDecimal(quantity), v.unit(),
				v.purchasedAt(), v.expiresAt(), v.openedAt(), v.remindBeforeDays());
	}

	static ProductService.Values dates(ProductService.Values v, LocalDate purchased, LocalDate expires,
			LocalDate opened) {
		return new ProductService.Values(v.name(), v.brand(), v.category(), v.zone(), v.quantity(), v.unit(), purchased,
				expires, opened, v.remindBeforeDays());
	}

}
