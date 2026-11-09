package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class FreshnessTest {

	@ParameterizedTest(name = "{0} дн. → {1}")
	@CsvSource({ "-30, expired", "-1, expired", "0, today", "1, soon", "2, soon", "3, fresh", "90, fresh" })
	void bucketsByDaysLeft(long days, String code) {
		assertThat(Freshness.of(days).code()).isEqualTo(code);
	}

	@ParameterizedTest(name = "{0} → {1}")
	@CsvSource({ "350.000, 350", "1.500, 1.5", "0.125, 0.125", "1000, 1000", "2.0, 2" })
	void quantityIsPlainWithoutTrailingZeros(String stored, String json) {
		assertThat(ProductResponse.plain(new BigDecimal(stored)).toString()).isEqualTo(json);
	}

	@ParameterizedTest(name = "{0} → {1}")
	@CsvSource(value = { "50%|50\\%", "a_b|a\\_b", "c:\\x|c:\\\\x", "йогурт|йогурт" }, delimiter = '|')
	void likeWildcardsAreEscaped(String raw, String escaped) {
		assertThat(ProductFilter.escapeLike(raw)).isEqualTo(escaped);
	}

}
