package ua.zwf.api.dictionary;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import ua.zwf.api.product.OpenedShelfLife;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.StorageZone;
import ua.zwf.api.product.Unit;

class DictionariesTest {

	@Test
	void coversEveryEnumValueInDeclarationOrder() {
		var all = Dictionaries.all();

		assertThat(all.categories()).extracting(Dictionaries.CategoryEntry::code).containsExactly(ProductCategory.values());
		assertThat(all.zones()).extracting(Dictionaries.ZoneEntry::code).containsExactly(StorageZone.values());
		assertThat(all.units()).extracting(Dictionaries.UnitEntry::code).containsExactly(Unit.values());
		assertThat(all.categories()).allSatisfy(c -> {
			assertThat(c.defaultZone()).isNotNull();
			assertThat(c.openedShelfLifeDays()).isEqualTo(OpenedShelfLife.categoryDays(c.code()));
		});
		assertThat(all.openedShelfLifeRules()).hasSameSizeAs(OpenedShelfLife.rules());
	}

	@Test
	void zonesMatchTheMockupTemperatures() {
		assertThat(Dictionaries.all().zones()).containsExactly(
				new Dictionaries.ZoneEntry(StorageZone.FRESH, 0, 2),
				new Dictionaries.ZoneEntry(StorageZone.MIDDLE, 4, 6),
				new Dictionaries.ZoneEntry(StorageZone.DOOR, 6, 8),
				new Dictionaries.ZoneEntry(StorageZone.FREEZER, -18, -18));
	}

	@Test
	void closedPackageShelfLifeIsLongerThanOpened() {
		for (ProductCategory category : ProductCategory.values()) {
			assertThat(Dictionaries.defaultShelfLifeDays(category)).isGreaterThanOrEqualTo(
					OpenedShelfLife.categoryDays(category));
		}
		assertThat(Dictionaries.defaultShelfLifeDays(ProductCategory.MEAT)).isEqualTo(3);
	}

	@Test
	void defaultZoneByCategory() {
		assertThat(Dictionaries.defaultZone(ProductCategory.MEAT)).isEqualTo(StorageZone.FRESH);
		assertThat(Dictionaries.defaultZone(ProductCategory.SAUCES)).isEqualTo(StorageZone.DOOR);
		assertThat(Dictionaries.defaultZone(ProductCategory.DAIRY)).isEqualTo(StorageZone.MIDDLE);
	}

	@Test
	void serializesWithLowercaseCodes() {
		var json = JsonMapper.builder().build().writeValueAsString(Dictionaries.all());

		assertThat(json).contains("{\"code\":\"dairy\",\"defaultZone\":\"middle\",\"defaultShelfLifeDays\":7,\"openedShelfLifeDays\":4}")
			.contains("{\"code\":\"pcs\",\"kind\":\"count\"}")
			.contains("\"remindBeforeDays\":[1,2,3,7]")
			.contains("\"defaultRemindBeforeDays\":2")
			.contains("{\"category\":\"dairy\",\"keywords\":[\"йогурт\",\"сметан\"],\"days\":5}");
	}

}
