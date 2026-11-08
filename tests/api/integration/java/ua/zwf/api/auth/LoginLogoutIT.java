package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.TestData;

/** B-03: вхід, вихід, «Запам'ятати мене», захист від фіксації сесії — справжній HTTP + Spring Session JDBC. */
class LoginLogoutIT extends IntegrationTest {

	static final int THIRTY_DAYS = 30 * 24 * 60 * 60;

	static final int TWELVE_HOURS = 12 * 60 * 60;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void loginReturnsProfileAndOpensSession() {
		var email = registeredUser();
		var client = client();

		var response = client.post("/api/auth/login", login(email.toUpperCase(), TestData.PASSWORD, false));

		assertThat(response.status()).isEqualTo(200);
		assertThat(response.json()).containsEntry("email", email).containsEntry("role", "OWNER");
		assertThat(response.setCookie(ApiClient.SESSION_COOKIE)).hasValueSatisfying(
				h -> assertThat(h).containsIgnoringCase("HttpOnly").containsIgnoringCase("SameSite=Lax"));
		assertThat(client.get("/api/auth/me").status()).isEqualTo(200);
	}

	@Test
	void wrongPasswordAndUnknownEmailGetIdenticalResponses() {
		var email = registeredUser();

		var wrongPassword = client().post("/api/auth/login", login(email, "Wrong-pass-123", false));
		var unknownEmail = client().post("/api/auth/login", login(TestData.uniqueEmail(), "Wrong-pass-123", false));

		assertThat(wrongPassword.status()).isEqualTo(401);
		assertThat(unknownEmail.status()).isEqualTo(401);
		assertThat(wrongPassword.json()).containsEntry("code", "INVALID_CREDENTIALS").isEqualTo(unknownEmail.json());
		assertThat(wrongPassword.setCookie(ApiClient.SESSION_COOKIE)).isEmpty();
	}

	@Test
	void missingFieldsAreValidationErrors() {
		var response = client().post("/api/auth/login", login("not-an-email", "", false));

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "VALIDATION_FAILED")
			.containsEntry("errors", Map.of("email", "Email", "password", "NotBlank"));
	}

	@Test
	void loginRequiresCsrf() {
		var email = registeredUser();
		var client = client();
		client.get("/api/auth/csrf");

		assertThat(client.postRaw("/api/auth/login", login(email, TestData.PASSWORD, false), null).status())
			.isEqualTo(403);
	}

	@Test
	void withoutRememberMeCookieDiesWithBrowserAndSessionLasts12h() {
		var email = registeredUser();

		var response = client().post("/api/auth/login", login(email, TestData.PASSWORD, false));

		assertThat(response.setCookie(ApiClient.SESSION_COOKIE)).hasValueSatisfying(
				h -> assertThat(h).doesNotContainIgnoringCase("Max-Age").doesNotContainIgnoringCase("Expires"));
		assertThat(sessionTimeouts(email)).containsExactly(TWELVE_HOURS);
	}

	@Test
	void rememberMeMakesCookiePersistentAndSessionLast30Days() {
		var email = registeredUser();

		var response = client().post("/api/auth/login", login(email, TestData.PASSWORD, true));

		assertThat(response.setCookie(ApiClient.SESSION_COOKIE)).hasValueSatisfying(header -> {
			var maxAge = Long.parseLong(header.replaceAll("(?i).*Max-Age=(\\d+).*", "$1"));
			assertThat(maxAge).isGreaterThanOrEqualTo(THIRTY_DAYS);
		});
		assertThat(sessionTimeouts(email)).containsExactly(THIRTY_DAYS);
	}

	@Test
	void registrationRemembersByDefault() {
		var email = TestData.uniqueEmail();

		var response = client().post("/api/auth/register", RegistrationIT.body("Олена", email, TestData.PASSWORD));

		assertThat(response.setCookie(ApiClient.SESSION_COOKIE))
			.hasValueSatisfying(h -> assertThat(h).containsIgnoringCase("Max-Age"));
		assertThat(sessionTimeouts(email)).containsExactly(THIRTY_DAYS);
	}

	@Test
	void loginRotatesSessionIdSoOldIdIsUseless() {
		var first = registeredUser();
		var second = registeredUser();
		var client = client();
		client.post("/api/auth/login", login(first, TestData.PASSWORD, false));
		var oldSessionId = client.cookie(ApiClient.SESSION_COOKIE).orElseThrow();

		client.post("/api/auth/login", login(second, TestData.PASSWORD, false));

		var newSessionId = client.cookie(ApiClient.SESSION_COOKIE).orElseThrow();
		assertThat(newSessionId).isNotEqualTo(oldSessionId);
		assertThat(client.get("/api/auth/me").json()).containsEntry("email", second);
		var attacker = client();
		attacker.setCookie(ApiClient.SESSION_COOKIE, oldSessionId);
		assertThat(attacker.get("/api/auth/me").status()).isEqualTo(401);
	}

	@Test
	void logoutDestroysSessionAndExpiresCookie() {
		var email = registeredUser();
		var client = client();
		client.post("/api/auth/login", login(email, TestData.PASSWORD, true));
		var sessionId = client.cookie(ApiClient.SESSION_COOKIE).orElseThrow();

		var response = client.post("/api/auth/logout", null);

		assertThat(response.status()).isEqualTo(204);
		assertThat(response.setCookie(ApiClient.SESSION_COOKIE))
			.hasValueSatisfying(h -> assertThat(h).containsIgnoringCase("Max-Age=0"));
		assertThat(client.get("/api/auth/me").status()).isEqualTo(401);
		assertThat(sessionTimeouts(email)).isEmpty();
		var replay = client();
		replay.setCookie(ApiClient.SESSION_COOKIE, sessionId);
		assertThat(replay.get("/api/auth/me").status()).isEqualTo(401);
	}

	@Test
	void logoutIssuesFreshCsrfTokenSoUserCanSignInAgainImmediately() {
		var email = registeredUser();
		var client = client();
		client.post("/api/auth/login", login(email, TestData.PASSWORD, false));
		var before = client.csrfToken().orElseThrow();

		client.post("/api/auth/logout", null);

		assertThat(client.csrfToken()).hasValueSatisfying(after -> assertThat(after).isNotEqualTo(before));
		assertThat(client.post("/api/auth/login", login(email, TestData.PASSWORD, false)).status()).isEqualTo(200);
	}

	@Test
	void logoutRequiresCsrf() {
		var email = registeredUser();
		var client = client();
		client.post("/api/auth/login", login(email, TestData.PASSWORD, false));

		assertThat(client.postRaw("/api/auth/logout", null, null).status()).isEqualTo(403);
		assertThat(client.get("/api/auth/me").status()).isEqualTo(200);
	}

	@Test
	void anonymousLogoutIsHarmless() {
		assertThat(client().post("/api/auth/logout", null).status()).isEqualTo(204);
	}

	private String registeredUser() {
		var email = TestData.uniqueEmail();
		var response = client().post("/api/auth/register", RegistrationIT.body("Олена Кравченко", email, TestData.PASSWORD));
		assertThat(response.status()).isEqualTo(201);
		// реєстрація відкрила власну сесію — прибираємо, щоб рахувати лише сесії від входу
		jdbc.update("delete from spring_session where principal_name = ?", email);
		return email;
	}

	private List<Integer> sessionTimeouts(String email) {
		return jdbc.queryForList("select max_inactive_interval from spring_session where principal_name = ?",
				Integer.class, email);
	}

	static Map<String, Object> login(String email, String password, boolean rememberMe) {
		var body = new LinkedHashMap<String, Object>();
		body.put("email", email);
		body.put("password", password);
		body.put("rememberMe", rememberMe);
		return body;
	}

}
