package ua.zwf.api.household;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Шапка «Моя сім'я»: назва, кількість учасників і що може поточний користувач —
 * фронтенд ховає недоступні дії (F-62) за {@code permissions}, а не за назвою ролі.
 */
public record HouseholdResponse(UUID id, String name, Instant createdAt, long memberCount, HouseholdRole role,
		List<HouseholdPermission> permissions) {
}
