package ua.zwf.api.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;

class CodedTest {

	@Test
	void findsByCodeIgnoringCaseAndSpaces() {
		assertThat(Coded.find(ProductCategory.class, " Dairy ")).contains(ProductCategory.DAIRY);
		assertThat(Coded.of(Unit.class, "pcs")).isEqualTo(Unit.PIECES);
	}

	@Test
	void unknownOrNullCodeIsEmpty() {
		assertThat(Coded.find(ProductCategory.class, "DAIRY_X")).isEmpty();
		assertThat(Coded.find(ProductCategory.class, null)).isEmpty();
		// Код, а не ім'я константи
		assertThat(Coded.find(Unit.class, "GRAMS")).isEmpty();
	}

	@Test
	void ofThrowsOnUnknownCode() {
		assertThatThrownBy(() -> Coded.of(Unit.class, "kilo")).isInstanceOf(IllegalArgumentException.class)
			.hasMessageContaining("Unit")
			.hasMessageContaining("kilo");
	}

}
