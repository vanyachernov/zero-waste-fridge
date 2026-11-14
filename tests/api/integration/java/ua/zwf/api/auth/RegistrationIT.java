package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.TestData;

/** B-02: POST /api/auth/register на справжньому HTTP + перевірка стану в PostgreSQL. */
class RegistrationIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void registersUserWithOwnHouseholdAndReturnsProfile() {
		var email = TestData.uniqueEmail();

		var response = client().post("/api/auth/register", body("Олена Кравченко", email.toUpperCase(), TestData.PASSWORD));

		assertThat(response.status()).isEqualTo(201);
		var json = response.json();
		assertThat(json).containsEntry("email", email)
			.containsEntry("name", "Олена Кравченко")
			.containsEntry("householdName", "Сім'я Кравченко")
			.containsEntry("role", "OWNER")
			.containsKeys("id", "householdId")
			.doesNotContainKeys("password", "passwordHash");
	}

	@Test
	void persistsHashedPasswordAndOwnerMembership() {
		var email = TestData.uniqueEmail();

		var json = client().post("/api/auth/register", body("Максим Кравченко", email, TestData.PASSWORD)).json();

		var row = jdbc.queryForMap("""
				select u.password_hash, m.role, h.name as household, h.id as household_id
				from app_user u
				join household_member m on m.user_id = u.id
				join household h on h.id = m.household_id
				where u.email = ?""", email);
		assertThat((String) row.get("password_hash")).startsWith("{bcrypt}$2").doesNotContain(TestData.PASSWORD);
		assertThat(row.get("role")).isEqualTo("OWNER");
		assertThat(row.get("household")).isEqualTo("Сім'я Кравченко");
		assertThat(row.get("household_id").toString()).isEqualTo(json.get("householdId"));
	}

	@Test
	void signsInImmediatelyWithHttpOnlySessionCookie() {
		var client = client();
		var email = TestData.uniqueEmail();

		var response = client.post("/api/auth/register", body("Олена", email, TestData.PASSWORD));

		assertThat(response.setCookie(ApiClient.SESSION_COOKIE)).hasValueSatisfying(header -> assertThat(header)
			.containsIgnoringCase("HttpOnly")
			.containsIgnoringCase("SameSite=Lax")
			.contains("Path=/"));
		var principal = jdbc.queryForObject("select count(*) from spring_session where principal_name = ?",
				Integer.class, email);
		assertThat(principal).isEqualTo(1);
	}

	@Test
	void rotatesCsrfTokenOnSignIn() {
		var client = client();
		client.get("/api/auth/csrf");
		var before = client.csrfToken().orElseThrow();

		var response = client.post("/api/auth/register", body("Олена", TestData.uniqueEmail(), TestData.PASSWORD));

		assertThat(response.status()).isEqualTo(201);
		assertThat(client.csrfToken()).hasValueSatisfying(after -> assertThat(after).isNotEqualTo(before));
	}

	@Test
	void duplicateEmailIsCaseInsensitiveConflict() {
		var email = TestData.uniqueEmail();
		client().post("/api/auth/register", body("Олена", email, TestData.PASSWORD));

		var response = client().post("/api/auth/register", body("Інша", "  " + email.toUpperCase() + " ", TestData.PASSWORD));

		assertThat(response.status()).isEqualTo(409);
		assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(
				ct -> assertThat(ct).startsWith("application/problem+json"));
		assertThat(response.json()).containsEntry("code", "EMAIL_TAKEN")
			.containsEntry("errors", Map.of("email", "EMAIL_TAKEN"));
		assertThat(jdbc.queryForObject("select count(*) from app_user where email = ?", Integer.class, email))
			.isEqualTo(1);
	}

	@Test
	void invalidFieldsReturnConstraintCodes() {
		var response = client().post("/api/auth/register", body("  ", "not-an-email", TestData.PASSWORD));

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "VALIDATION_FAILED")
			.containsEntry("errors", Map.of("name", "NotBlank", "email", "Email"));
	}

	@Test
	void weakPasswordIsRejectedWithPolicyReason() {
		var email = TestData.uniqueEmail();

		var response = client().post("/api/auth/register", body("Олена", email, "1234567"));

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "PASSWORD_POLICY")
			.containsEntry("errors", Map.of("password", "TOO_SHORT"));
		assertThat(jdbc.queryForObject("select count(*) from app_user where email = ?", Integer.class, email))
			.isZero();
	}

	@Test
	void malformedJsonIsBadRequest() {
		var client = client();
		client.get("/api/auth/csrf");

		var response = client.postRaw("/api/auth/register", "{not json", client.csrfToken().orElseThrow());

		assertThat(response.status()).isEqualTo(400);
	}

	@Test
	void requiresCsrfToken() {
		var client = client();
		client.get("/api/auth/csrf");

		var response = client.postRaw("/api/auth/register", body("Олена", TestData.uniqueEmail(), TestData.PASSWORD),
				null);

		assertThat(response.status()).isEqualTo(403);
	}

	static Map<String, Object> body(String name, String email, String password) {
		var body = new LinkedHashMap<String, Object>();
		body.put("name", name);
		body.put("email", email);
		body.put("password", password);
		return body;
	}

}
