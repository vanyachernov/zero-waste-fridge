package ua.zwf.api.product;

/**
 * B-14: три StatCard над таблицею холодильника.
 *
 * @param total активні продукти
 * @param addedThisWeek з них додано за останні 7 днів («+N за тиждень»)
 * @param soon зіпсуються протягом 48 годин: сьогодні, завтра або післязавтра
 * @param today з них — сьогодні
 * @param expired уже прострочені
 */
public record ProductSummary(long total, long addedThisWeek, long soon, long today, long expired) {
}
