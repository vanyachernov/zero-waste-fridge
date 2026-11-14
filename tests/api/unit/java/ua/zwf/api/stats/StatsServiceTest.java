package ua.zwf.api.stats;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.common.Today;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;
import ua.zwf.api.product.WriteOffOutcome;

class StatsServiceTest {

	static final ZoneId KYIV = ZoneId.of("Europe/Kyiv");

	final Today today = new Today(Clock.fixed(Instant.parse("2026-11-14T10:00:00Z"), KYIV), KYIV);

	final UUID olena = UUID.randomUUID();

	final UUID maksym = UUID.randomUUID();

	StatsService.Row row(UUID product, String name, ProductCategory category, WriteOffOutcome outcome, String qty,
			Unit unit, String at, UUID actor) {
		return new StatsService.Row(product, name, category, outcome, new BigDecimal(qty), unit, Instant.parse(at), actor,
				actor == olena ? "Олена" : "Максим");
	}

	@Test
	void summarizesMonthsCategoriesFootprintWasteAndMembers() {
		UUID mince = UUID.randomUUID();
		UUID yogurt = UUID.randomUUID();
		UUID milk = UUID.randomUUID();
		UUID eggs = UUID.randomUUID();
		var rows = List.of(
				// листопад
				row(mince, "Фарш", ProductCategory.MEAT, WriteOffOutcome.COOKED, "500", Unit.GRAMS, "2026-11-10T12:00:00Z", olena),
				row(yogurt, "Йогурт", ProductCategory.DAIRY, WriteOffOutcome.EATEN, "200", Unit.GRAMS, "2026-11-11T12:00:00Z", maksym),
				row(yogurt, "Йогурт", ProductCategory.DAIRY, WriteOffOutcome.WASTED, "150", Unit.GRAMS, "2026-11-12T12:00:00Z", maksym),
				row(eggs, "Яйця", ProductCategory.OTHER, WriteOffOutcome.EATEN, "2", Unit.PIECES, "2026-11-13T12:00:00Z", olena),
				// жовтень
				row(milk, "Молоко", ProductCategory.DAIRY, WriteOffOutcome.WASTED, "1", Unit.LITERS, "2026-10-05T12:00:00Z", olena),
				row(UUID.randomUUID(), "молоко ", ProductCategory.DAIRY, WriteOffOutcome.WASTED, "0.5", Unit.LITERS, "2026-10-20T12:00:00Z", olena));

		var o = StatsService.summarize(rows, YearMonth.of(2026, 9), YearMonth.of(2026, 11), today);

		assertThat(o.from()).hasToString("2026-09-01");
		assertThat(o.to()).hasToString("2026-11-30");
		assertThat(o.months()).containsExactly(new StatsService.MonthStats("2026-09", 0, 0),
				new StatsService.MonthStats("2026-10", 0, 2), new StatsService.MonthStats("2026-11", 3, 1));

		var c = o.current();
		assertThat(c.month()).isEqualTo("2026-11");
		assertThat(c.saved()).isEqualTo(3);
		assertThat(c.wasted()).isEqualTo(1);
		assertThat(c.saveRate()).isEqualTo(75);
		// 0.5 кг фаршу + 0.2 кг йогурту + 2 шт × 0.3 кг
		assertThat(c.savedKg()).isEqualTo(1.3);
		assertThat(c.wastedKg()).isEqualTo(0.2);
		assertThat(c.co2SavedKg()).isEqualTo(11.8); // 0.5 × 20 + 0.2 × 3 + 0.6 × 2, округлено до 0.1
		assertThat(c.co2WastedKg()).isEqualTo(0.5);

		assertThat(o.byCategory()).first().isEqualTo(new StatsService.CategoryStats(ProductCategory.DAIRY, 1, 3));
		// «Молоко» й «молоко » — один продукт у топі, кількості складаються
		assertThat(o.topWasted()).first().satisfies(w -> {
			assertThat(w.name()).isEqualTo("Молоко");
			assertThat(w.times()).isEqualTo(2);
			assertThat(w.quantity()).isEqualByComparingTo("1.5");
			assertThat(w.unit()).isEqualTo(Unit.LITERS);
		});
		assertThat(o.members()).extracting(StatsService.MemberStats::name, StatsService.MemberStats::saved)
			.containsExactly(org.assertj.core.groups.Tuple.tuple("Олена", 2L), org.assertj.core.groups.Tuple.tuple("Максим", 1L));
	}

	@Test
	void emptyMonthHasNoRate() {
		var o = StatsService.summarize(List.of(), YearMonth.of(2026, 11), YearMonth.of(2026, 11), today);
		assertThat(o.current().saveRate()).isNull();
		assertThat(o.months()).singleElement().isEqualTo(new StatsService.MonthStats("2026-11", 0, 0));
		assertThat(o.byCategory()).isEmpty();
		assertThat(o.topWasted()).isEmpty();
	}

	@Test
	void footprintConvertsUnits() {
		assertThat(FoodFootprint.kilograms(new BigDecimal("250"), Unit.MILLILITERS, ProductCategory.DAIRY)).isEqualTo(0.25);
		assertThat(FoodFootprint.kilograms(new BigDecimal("2"), Unit.KILOGRAMS, ProductCategory.MEAT)).isEqualTo(2.0);
		assertThat(FoodFootprint.kilograms(new BigDecimal("3"), Unit.PIECES, ProductCategory.FRUITS)).isEqualTo(0.6000000000000001);
		assertThat(FoodFootprint.kilograms(null, null, ProductCategory.OTHER)).isZero();
		assertThat(FoodFootprint.round1(1.26)).isEqualTo(1.3);
	}

}
