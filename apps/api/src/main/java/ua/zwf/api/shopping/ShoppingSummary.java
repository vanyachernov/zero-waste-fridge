package ua.zwf.api.shopping;

import java.math.BigDecimal;

/**
 * B-45: «Куплено 4 з 6 · орієнтовно 480 ₴» і «Авто-ввіз N товари».
 *
 * @param estimatedTotal сума орієнтовних цін усіх позицій (без ціни — не рахуються)
 * @param autoCount позиції Smart Sync, які ще треба купити
 */
public record ShoppingSummary(long bought, long total, BigDecimal estimatedTotal, long autoCount) {
}
