package ua.zwf.api.product;

import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Довідник «скільки днів продукт придатний після відкриття упаковки» (B-12).
 *
 * <p>Спершу шукається правило за ключовими словами в назві (йогурт — 5 днів, молоко — 3 дні), потім береться
 * типовий термін категорії. Правила впорядковані від конкретних до загальних: перше збігання перемагає.
 */
public final class OpenedShelfLife {

	/** Правило для продуктів, назва яких містить одне з ключових слів (без урахування регістру). */
	public record Rule(ProductCategory category, List<String> keywords, int days) {

		public Rule {
			keywords = keywords.stream().map(k -> k.toLowerCase(Locale.ROOT)).toList();
		}

		boolean matches(ProductCategory productCategory, String lowerName) {
			return category == productCategory && keywords.stream().anyMatch(lowerName::contains);
		}

	}

	private static final Map<ProductCategory, Integer> CATEGORY_DAYS = new EnumMap<>(Map.of(
			ProductCategory.VEGETABLES, 3,
			ProductCategory.DAIRY, 4,
			ProductCategory.MEAT, 2,
			ProductCategory.FRUITS, 3,
			ProductCategory.SAUCES, 30,
			ProductCategory.OTHER, 5));

	private static final List<Rule> RULES = List.of(
			new Rule(ProductCategory.DAIRY, List.of("гауда", "пармезан", "чедер", "сир твердий", "масло"), 14),
			new Rule(ProductCategory.DAIRY, List.of("моцарел", "буррат", "рікот"), 2),
			new Rule(ProductCategory.DAIRY, List.of("йогурт", "сметан"), 5),
			new Rule(ProductCategory.DAIRY, List.of("молоко", "вершки", "кефір", "ряжанк"), 3),
			new Rule(ProductCategory.MEAT, List.of("фарш"), 1),
			new Rule(ProductCategory.MEAT, List.of("ковбас", "шинк", "бекон"), 5),
			new Rule(ProductCategory.VEGETABLES, List.of("шпинат", "салат", "зелень", "рукол"), 2),
			new Rule(ProductCategory.FRUITS, List.of("полуниц", "малин", "ягод", "лохин"), 2),
			new Rule(ProductCategory.SAUCES, List.of("песто"), 7),
			new Rule(ProductCategory.SAUCES, List.of("майонез"), 14),
			new Rule(ProductCategory.OTHER, List.of("сік", "смузі"), 3),
			new Rule(ProductCategory.OTHER, List.of("хумус"), 4));

	private OpenedShelfLife() {
	}

	public static int days(ProductCategory category, String name) {
		String lowerName = name == null ? "" : name.toLowerCase(Locale.ROOT);
		return RULES.stream()
			.filter(rule -> rule.matches(category, lowerName))
			.findFirst()
			.map(Rule::days)
			.orElseGet(() -> categoryDays(category));
	}

	public static int categoryDays(ProductCategory category) {
		return CATEGORY_DAYS.get(category);
	}

	public static List<Rule> rules() {
		return RULES;
	}

}
