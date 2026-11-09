package ua.zwf.api.support;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Склад сім'ї для інтеграційних тестів, поки немає (або в обхід) запрошень B-52: переносить
 * членство учасника в домогосподарство власника з потрібною роллю, а його порожнє — видаляє.
 */
public final class Family {

	private Family() {
	}

	public static UUID userId(ApiClient client) {
		return UUID.fromString((String) client.get("/api/auth/me").json().get("id"));
	}

	public static UUID householdId(ApiClient client) {
		return UUID.fromString((String) client.get("/api/auth/me").json().get("householdId"));
	}

	public static void join(JdbcTemplate jdbc, ApiClient owner, ApiClient member, String role) {
		UUID target = householdId(owner);
		UUID old = householdId(member);
		jdbc.update("update household_member set household_id = ?, role = ? where user_id = ?", target, role,
				userId(member));
		jdbc.update("delete from household where id = ?", old);
	}

}
