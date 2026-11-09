package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.format.support.DefaultFormattingConversionService;
import ua.zwf.api.product.Freshness;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductSort;
import ua.zwf.api.product.ProductStatus;

class CodedEnumConvertersTest {

	private final DefaultFormattingConversionService conversion = new DefaultFormattingConversionService();

	{
		new CodedEnumConverters().addFormatters(conversion);
	}

	@Test
	void queryParamsUseCodes() {
		assertThat(conversion.convert("dairy", ProductCategory.class)).isEqualTo(ProductCategory.DAIRY);
		assertThat(conversion.convert("soon", Freshness.class)).isEqualTo(Freshness.SOON);
		assertThat(conversion.convert("added", ProductSort.class)).isEqualTo(ProductSort.ADDED);
	}

	@Test
	void plainEnumsByNameIgnoringCase() {
		assertThat(conversion.convert("wasted", ProductStatus.class)).isEqualTo(ProductStatus.WASTED);
	}

	@Test
	void unknownCodeFails() {
		assertThatThrownBy(() -> conversion.convert("fish", ProductCategory.class)).hasRootCauseInstanceOf(
				IllegalArgumentException.class);
	}

}
