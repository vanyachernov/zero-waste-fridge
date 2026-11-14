package ua.zwf.api.stats;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.Today;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductEventType;
import ua.zwf.api.product.Unit;
import ua.zwf.api.product.WriteOffOutcome;

/** B-200: «Статистика & Екологія» — усе з журналу списань (product_event WRITTEN_OFF). */
@Service
public class StatsService {

	public static final int MAX_MONTHS = 12;

	/** Скільки різних продуктів урятовано / викинуто; продукт, який частково з'їли й частково викинули, — в обох. */
	public record MonthStats(String month, long saved, long wasted) {
	}

	/**
	 * Підсумок поточного місяця.
	 *
	 * @param saveRate частка врятованого серед списаного, %; {@code null}, якщо нічого не списано
	 */
	public record Current(String month, long saved, long wasted, Integer saveRate, double savedKg, double wastedKg,
			double co2SavedKg, double co2WastedKg) {
	}

	public record CategoryStats(ProductCategory category, long saved, long wasted) {
	}

	public record WastedProduct(String name, long times, BigDecimal quantity, Unit unit) {
	}

	public record MemberStats(UUID userId, String name, long saved) {
	}

	public record Overview(LocalDate from, LocalDate to, List<MonthStats> months, Current current,
			List<CategoryStats> byCategory, List<WastedProduct> topWasted, List<MemberStats> members) {
	}

	/** Рядок журналу, потрібний для підрахунків. */
	public record Row(UUID productId, String name, ProductCategory category, WriteOffOutcome outcome, BigDecimal quantity,
			Unit unit, Instant at, UUID actorId, String actorName) {

		boolean saved() {
			return outcome != WriteOffOutcome.WASTED;
		}

	}

	private final EntityManager em;

	private final Today today;

	public StatsService(EntityManager em, Today today) {
		this.em = em;
		this.today = today;
	}

	@Transactional(readOnly = true)
	public Overview overview(UUID householdId, int months) {
		YearMonth current = YearMonth.from(today.date());
		YearMonth first = current.minusMonths(months - 1L);
		Instant start = first.atDay(1).atStartOfDay(today.zone()).toInstant();
		Instant end = current.plusMonths(1).atDay(1).atStartOfDay(today.zone()).toInstant();
		List<Row> rows = em.createQuery("""
				select new ua.zwf.api.stats.StatsService$Row(p.id, p.name, p.category, e.outcome, e.quantity, e.unit,
				  e.occurredAt, a.id, a.name)
				from ProductEvent e join e.product p left join e.actor a
				where e.household.id = :household and e.type = :type and e.occurredAt >= :start and e.occurredAt < :end""",
				Row.class)
			.setParameter("household", householdId)
			.setParameter("type", ProductEventType.WRITTEN_OFF)
			.setParameter("start", start)
			.setParameter("end", end)
			.getResultList();
		return summarize(rows, first, current, today);
	}

	static Overview summarize(List<Row> rows, YearMonth first, YearMonth current, Today today) {
		Map<YearMonth, List<Row>> byMonth = new LinkedHashMap<>();
		for (YearMonth m = first; !m.isAfter(current); m = m.plusMonths(1)) {
			byMonth.put(m, new ArrayList<>());
		}
		for (Row r : rows) {
			byMonth.computeIfPresent(YearMonth.from(r.at().atZone(today.zone())), (k, list) -> {
				list.add(r);
				return list;
			});
		}
		var monthStats = byMonth.entrySet()
			.stream()
			.map(e -> new MonthStats(e.getKey().toString(), distinct(e.getValue(), true), distinct(e.getValue(), false)))
			.toList();

		var now = byMonth.get(current);
		long saved = distinct(now, true);
		long wasted = distinct(now, false);
		double savedKg = 0;
		double wastedKg = 0;
		double co2Saved = 0;
		double co2Wasted = 0;
		for (Row r : now) {
			double kg = FoodFootprint.kilograms(r.quantity(), r.unit(), r.category());
			if (r.saved()) {
				savedKg += kg;
				co2Saved += FoodFootprint.co2(kg, r.category());
			}
			else {
				wastedKg += kg;
				co2Wasted += FoodFootprint.co2(kg, r.category());
			}
		}
		Integer rate = saved + wasted == 0 ? null : (int) Math.round(100.0 * saved / (saved + wasted));
		var currentStats = new Current(current.toString(), saved, wasted, rate, FoodFootprint.round1(savedKg),
				FoodFootprint.round1(wastedKg), FoodFootprint.round1(co2Saved), FoodFootprint.round1(co2Wasted));

		Map<ProductCategory, long[]> categories = new EnumMap<>(ProductCategory.class);
		Map<ProductCategory, Set<UUID>[]> seen = new EnumMap<>(ProductCategory.class);
		for (Row r : rows) {
			@SuppressWarnings("unchecked")
			Set<UUID>[] sets = seen.computeIfAbsent(r.category(), c -> new Set[] { new HashSet<>(), new HashSet<>() });
			if (sets[r.saved() ? 0 : 1].add(r.productId())) {
				categories.computeIfAbsent(r.category(), c -> new long[2])[r.saved() ? 0 : 1]++;
			}
		}
		var byCategory = categories.entrySet()
			.stream()
			.map(e -> new CategoryStats(e.getKey(), e.getValue()[0], e.getValue()[1]))
			.sorted(Comparator.comparingLong((CategoryStats c) -> c.saved() + c.wasted()).reversed())
			.toList();

		Map<String, WastedAcc> wastedByName = new HashMap<>();
		for (Row r : rows) {
			if (!r.saved()) {
				wastedByName.computeIfAbsent(r.name().strip().toLowerCase(), k -> new WastedAcc(r.name(), r.unit())).add(r);
			}
		}
		var topWasted = wastedByName.values()
			.stream()
			.sorted(Comparator.comparingLong((WastedAcc w) -> w.times).reversed().thenComparing(w -> w.name))
			.limit(5)
			.map(w -> new WastedProduct(w.name, w.times, w.mixedUnits ? null : w.quantity.stripTrailingZeros(),
					w.mixedUnits ? null : w.unit))
			.toList();

		Map<UUID, MemberAcc> members = new LinkedHashMap<>();
		for (Row r : now) {
			if (r.saved() && r.actorId() != null) {
				members.computeIfAbsent(r.actorId(), id -> new MemberAcc(id, r.actorName())).products.add(r.productId());
			}
		}
		var memberStats = members.values()
			.stream()
			.map(m -> new MemberStats(m.id, m.name, m.products.size()))
			.sorted(Comparator.comparingLong(MemberStats::saved).reversed().thenComparing(MemberStats::name))
			.toList();

		return new Overview(first.atDay(1), current.atEndOfMonth(), monthStats, currentStats, byCategory, topWasted,
				memberStats);
	}

	private static long distinct(List<Row> rows, boolean saved) {
		return rows.stream().filter(r -> r.saved() == saved).map(Row::productId).distinct().count();
	}

	private static final class WastedAcc {

		final String name;

		final Unit unit;

		long times;

		BigDecimal quantity = BigDecimal.ZERO;

		boolean mixedUnits;

		WastedAcc(String name, Unit unit) {
			this.name = name;
			this.unit = unit;
		}

		void add(Row r) {
			times++;
			if (r.unit() != unit) {
				mixedUnits = true;
			}
			else if (r.quantity() != null) {
				quantity = quantity.add(r.quantity());
			}
		}

	}

	private static final class MemberAcc {

		final UUID id;

		final String name;

		final Set<UUID> products = new HashSet<>();

		MemberAcc(UUID id, String name) {
			this.id = id;
			this.name = name;
		}

	}

}
