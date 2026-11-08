package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;

class HouseholdNamesTest {

	@ParameterizedTest
	@CsvSource({ "Олена Кравченко, Сім'я Кравченко", "'  Максим   Кравченко ', Сім'я Кравченко",
			"Анна Марія Шевченко, Сім'я Шевченко", "Олена, Мій холодильник", "'   ', Мій холодильник" })
	void derivesFromOwnerSurname(String owner, String expected) {
		assertThat(HouseholdNames.forOwner(owner)).isEqualTo(expected);
	}

	@ParameterizedTest
	@NullSource
	void fallsBackForNull(String owner) {
		assertThat(HouseholdNames.forOwner(owner)).isEqualTo(HouseholdNames.FALLBACK);
	}

}
