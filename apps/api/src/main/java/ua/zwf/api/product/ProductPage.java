package ua.zwf.api.product;

import java.util.List;
import java.util.Map;

/**
 * Сторінка списку: {@code page} рахується з 1, як у пагінації «Показано N із M».
 * {@code categoryCounts} — код категорії → кількість; лічильники для чіпів категорій з урахуванням пошуку й інших фільтрів, крім категорії.
 */
public record ProductPage(List<ProductResponse> items, int page, int size, long total, int totalPages,
		Map<String, Long> categoryCounts) {
}
