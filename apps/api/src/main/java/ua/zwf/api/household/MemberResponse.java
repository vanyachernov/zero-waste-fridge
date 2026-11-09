package ua.zwf.api.household;

import java.time.Instant;
import java.util.UUID;
import ua.zwf.api.activity.ActivityEntry;

/** Рядок таблиці «Учасники»: аватар, ім'я, email, роль, «Остання дія». {@code id} — id користувача. */
public record MemberResponse(UUID id, String name, String email, String avatarUrl, HouseholdRole role,
		Instant joinedAt, boolean me, ActivityEntry lastActivity) {
}
