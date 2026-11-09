package ua.zwf.api.dictionary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;

/** B-16: GET /api/dictionaries. */
class DictionaryIT extends IntegrationTest {

	@SuppressWarnings("unchecked")
	static List<Object> list(Map<String, Object> json, String key) {
		return (List<Object>) json.get(key);
	}

	@Test
	void requiresSession() {
		assertThat(client().get("/api/dictionaries").status()).isEqualTo(401);
	}

	@Test
	void returnsCodesForFormsAndFilters() {
		var client = Accounts.signUp(client(), "Олена");

		var response = client.get("/api/dictionaries");

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.headers().firstValue("Cache-Control")).hasValueSatisfying(
				v -> assertThat(v).contains("max-age=3600").contains("private"));
		var json = response.json();
		assertThat(list(json, "categories")).hasSize(6)
			.contains(Map.of("code", "meat", "defaultZone", "fresh", "openedShelfLifeDays", 2));
		assertThat(list(json, "zones")).contains(Map.of("code", "freezer", "minTemperatureC", -18,
				"maxTemperatureC", -18));
		assertThat(list(json, "units")).contains(Map.of("code", "kg", "kind", "mass"));
		assertThat(json).containsEntry("remindBeforeDays", List.of(1, 2, 3, 7)).containsEntry("defaultRemindBeforeDays", 2);
		assertThat(list(json, "openedShelfLifeRules"))
			.contains(Map.of("category", "dairy", "keywords", List.of("молоко", "вершки", "кефір", "ряжанк"), "days", 3));
	}

}
