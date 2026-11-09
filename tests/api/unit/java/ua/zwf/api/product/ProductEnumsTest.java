package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.common.Coded;

/** Коди мають збігатися з фронтендом (packages/api-client/src/types.ts) і CHECK у V4__product.sql. */
class ProductEnumsTest {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static List<String> codes(Coded[] values) {
		return Arrays.stream(values).map(Coded::code).toList();
	}

	@Test
	void codesMatchFrontendTypes() {
		assertThat(codes(ProductCategory.values())).containsExactly("vegetables", "dairy", "meat", "fruits", "sauces",
				"other");
		assertThat(codes(StorageZone.values())).containsExactly("fresh", "middle", "door", "freezer");
		assertThat(codes(Unit.values())).containsExactly("g", "kg", "ml", "l", "pcs");
	}

	@Test
	void jsonUsesCodes() {
		assertThat(JSON.writeValueAsString(Map.of("unit", Unit.KILOGRAMS))).isEqualTo("{\"unit\":\"kg\"}");
		assertThat(JSON.readValue("\"freezer\"", StorageZone.class)).isEqualTo(StorageZone.FREEZER);
		assertThat(JSON.readValue("\"Dairy\"", ProductCategory.class)).isEqualTo(ProductCategory.DAIRY);
	}

	@Test
	void jpaConvertersStoreCodes() {
		var converter = new ProductCategory.JpaConverter();
		assertThat(converter.convertToDatabaseColumn(ProductCategory.SAUCES)).isEqualTo("sauces");
		assertThat(converter.convertToEntityAttribute("sauces")).isEqualTo(ProductCategory.SAUCES);
		assertThat(converter.convertToDatabaseColumn(null)).isNull();
		assertThat(converter.convertToEntityAttribute(null)).isNull();
		assertThat(new Unit.JpaConverter().convertToEntityAttribute("ml")).isEqualTo(Unit.MILLILITERS);
		assertThat(new StorageZone.JpaConverter().convertToDatabaseColumn(StorageZone.DOOR)).isEqualTo("door");
	}

	@Test
	void reminderLeadMatchesModalOptions() {
		assertThat(ReminderLead.ALLOWED_DAYS).containsExactly(1, 2, 3, 7);
		assertThat(ReminderLead.isAllowed(ReminderLead.DEFAULT_DAYS)).isTrue();
		assertThat(ReminderLead.isAllowed(5)).isFalse();
	}

}
