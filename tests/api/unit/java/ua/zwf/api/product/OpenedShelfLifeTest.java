package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class OpenedShelfLifeTest {

	@ParameterizedTest(name = "{0} / {1} → {2} дн.")
	@CsvSource({
			"dairy, Грецький йогурт 5%, 5",
			"dairy, Молоко пастеризоване 2.5%, 3",
			"dairy, СМЕТАНА 20%, 5",
			"dairy, Сир твердий Гауда 45%, 14",
			"dairy, Моцарела міні, 2",
			"dairy, Масло вершкове 82%, 14",
			"dairy, Творог, 4",
			"meat, Фарш яловичий свіжий, 1",
			"meat, Філе куряче, 2",
			"vegetables, Шпинат Baby, 2",
			"vegetables, Морква, 3",
			"fruits, Полуниця солодка, 2",
			"sauces, Песто з базиліком, 7",
			"sauces, Кетчуп, 30",
			"other, Сік апельсиновий, 3",
			"other, Яйця, 5" })
	void keywordRuleThenCategoryDefault(String category, String name, int days) {
		assertThat(OpenedShelfLife.days(ProductCategory.fromCode(category), name)).isEqualTo(days);
	}

	@Test
	void keywordOfAnotherCategoryDoesNotApply() {
		// «йогурт» — правило молочних; питний йогурт у категорії «інше» отримує типовий термін «іншого»
		assertThat(OpenedShelfLife.days(ProductCategory.OTHER, "Йогурт питний")).isEqualTo(5);
	}

	@Test
	void nullNameFallsBackToCategory() {
		assertThat(OpenedShelfLife.days(ProductCategory.MEAT, null)).isEqualTo(2);
	}

	@Test
	void everyCategoryHasADefaultAndRulesAreSane() {
		Arrays.stream(ProductCategory.values())
			.forEach(c -> assertThat(OpenedShelfLife.categoryDays(c)).isBetween(1, 365));
		assertThat(OpenedShelfLife.rules()).allSatisfy(rule -> {
			assertThat(rule.days()).isBetween(1, 365);
			assertThat(rule.keywords()).isNotEmpty().allSatisfy(k -> assertThat(k).isLowerCase());
		});
	}

}
