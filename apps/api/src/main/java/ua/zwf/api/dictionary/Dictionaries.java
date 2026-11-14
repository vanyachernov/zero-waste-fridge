package ua.zwf.api.dictionary;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import ua.zwf.api.product.OpenedShelfLife;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ReminderLead;
import ua.zwf.api.product.StorageZone;
import ua.zwf.api.product.Unit;

/**
 * B-16: довідники для форм і фільтрів. Бекенд віддає лише коди й числа — назви та описи локалізує
 * фронтенд ({@code packages/i18n}), як і тексти помилок.
 */
public final class Dictionaries {

	/**
	 * @param defaultShelfLifeDays типовий термін закритої упаковки — коли купленому в списку покупок треба
	 *     підставити «придатний до» (B-42)
	 */
	public record CategoryEntry(ProductCategory code, StorageZone defaultZone, int defaultShelfLifeDays,
			int openedShelfLifeDays) {
	}

	/** Рекомендована температура зони, °C (картки зон на екрані «Мій холодильник»). */
	public record ZoneEntry(StorageZone code, int minTemperatureC, int maxTemperatureC) {
	}

	public enum UnitKind {

		MASS, VOLUME, COUNT;

		@com.fasterxml.jackson.annotation.JsonValue
		public String code() {
			return name().toLowerCase(java.util.Locale.ROOT);
		}

	}

	public record UnitEntry(Unit code, UnitKind kind) {
	}

	public record ShelfLifeRuleEntry(ProductCategory category, List<String> keywords, int days) {
	}

	public record Response(List<CategoryEntry> categories, List<ZoneEntry> zones, List<UnitEntry> units,
			List<Integer> remindBeforeDays, int defaultRemindBeforeDays, List<ShelfLifeRuleEntry> openedShelfLifeRules) {
	}

	private static final Map<ProductCategory, StorageZone> DEFAULT_ZONE = Map.of(
			ProductCategory.VEGETABLES, StorageZone.FRESH,
			ProductCategory.DAIRY, StorageZone.MIDDLE,
			ProductCategory.MEAT, StorageZone.FRESH,
			ProductCategory.FRUITS, StorageZone.FRESH,
			ProductCategory.SAUCES, StorageZone.DOOR,
			ProductCategory.OTHER, StorageZone.MIDDLE);

	private static final Map<ProductCategory, Integer> SHELF_LIFE = Map.of(
			ProductCategory.VEGETABLES, 7,
			ProductCategory.DAIRY, 7,
			ProductCategory.MEAT, 3,
			ProductCategory.FRUITS, 5,
			ProductCategory.SAUCES, 90,
			ProductCategory.OTHER, 14);

	private static final Map<StorageZone, int[]> TEMPERATURE = Map.of(
			StorageZone.FRESH, new int[] { 0, 2 },
			StorageZone.MIDDLE, new int[] { 4, 6 },
			StorageZone.DOOR, new int[] { 6, 8 },
			StorageZone.FREEZER, new int[] { -18, -18 });

	private static final Map<Unit, UnitKind> UNIT_KIND = Map.of(
			Unit.GRAMS, UnitKind.MASS,
			Unit.KILOGRAMS, UnitKind.MASS,
			Unit.MILLILITERS, UnitKind.VOLUME,
			Unit.LITERS, UnitKind.VOLUME,
			Unit.PIECES, UnitKind.COUNT);

	private static final Response RESPONSE = build();

	private Dictionaries() {
	}

	public static Response all() {
		return RESPONSE;
	}

	/** Зона, яку форма «Додати продукт» підставляє, коли користувач не вибрав її сам. */
	public static StorageZone defaultZone(ProductCategory category) {
		return DEFAULT_ZONE.get(category);
	}

	/** Типовий термін придатності закритого продукту категорії, днів. */
	public static int defaultShelfLifeDays(ProductCategory category) {
		return SHELF_LIFE.get(category);
	}

	private static Response build() {
		var categories = Arrays.stream(ProductCategory.values())
			.map(c -> new CategoryEntry(c, DEFAULT_ZONE.get(c), SHELF_LIFE.get(c), OpenedShelfLife.categoryDays(c)))
			.toList();
		var zones = Arrays.stream(StorageZone.values())
			.map(z -> new ZoneEntry(z, TEMPERATURE.get(z)[0], TEMPERATURE.get(z)[1]))
			.toList();
		var units = Arrays.stream(Unit.values()).map(u -> new UnitEntry(u, UNIT_KIND.get(u))).toList();
		var rules = OpenedShelfLife.rules()
			.stream()
			.map(r -> new ShelfLifeRuleEntry(r.category(), r.keywords(), r.days()))
			.toList();
		return new Response(categories, zones, units, ReminderLead.ALLOWED_DAYS, ReminderLead.DEFAULT_DAYS, rules);
	}

}
