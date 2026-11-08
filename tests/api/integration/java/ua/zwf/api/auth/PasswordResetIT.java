package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.auth.reset.ResetTokens;
import ua.zwf.api.mail.OutgoingMail;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.RecordingMailer;
import ua.zwf.api.support.TestData;

/** B-06: «Забули пароль?» → лист → новий пароль, з усіма захисними властивостями. */
class PasswordResetIT extends IntegrationTest {

	static final Pattern TOKEN = Pattern.compile("/lms/reset-password\\?token=([A-Za-z0-9_-]{43})");

	static final String NEW_PASSWORD = "Brand-new-pass-456";

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	RecordingMailer mailer;

	@Test
	void sendsResetLinkAndStoresOnlyTokenHash() {
		var email = registered();

		var response = client().post("/api/auth/password/forgot", Map.of("email", "  " + email.toUpperCase()));

		assertThat(response.status()).isEqualTo(202);
		var mails = mailer.sentTo(email);
		assertThat(mails).hasSize(1);
		OutgoingMail mail = mails.getFirst();
		assertThat(mail.subject()).contains("відновлення пароля");
		assertThat(mail.text()).contains("Олена Кравченко").contains("60 хв");
		assertThat(mail.html()).contains("href=");
		var token = tokenFrom(mail);
		var stored = jdbc.queryForList("""
				select token_hash from password_reset_token t join app_user u on u.id = t.user_id
				where u.email = ?""", String.class, email);
		assertThat(stored).containsExactly(ResetTokens.hash(token)).doesNotContain(token);
	}

	@Test
	void unknownEmailLooksExactlyTheSameButSendsNothing() {
		var unknown = TestData.uniqueEmail();

		var response = client().post("/api/auth/password/forgot", Map.of("email", unknown));

		assertThat(response.status()).isEqualTo(202);
		assertThat(response.body()).isEmpty();
		assertThat(mailer.sentTo(unknown)).isEmpty();
	}

	@Test
	void resetSetsNewPasswordAndOldStopsWorking() {
		var email = registered();
		var token = requestToken(email);

		var response = client().post("/api/auth/password/reset", Map.of("token", token, "password", NEW_PASSWORD));

		assertThat(response.status()).isEqualTo(204);
		assertThat(login(email, TestData.PASSWORD)).isEqualTo(401);
		assertThat(login(email, NEW_PASSWORD)).isEqualTo(200);
	}

	@Test
	void resetSignsOutEverySessionOfTheUser() {
		var email = registered();
		var laptop = client();
		var phone = client();
		laptop.post("/api/auth/login", LoginLogoutIT.login(email, TestData.PASSWORD, true));
		phone.post("/api/auth/login", LoginLogoutIT.login(email, TestData.PASSWORD, false));
		assertThat(laptop.get("/api/auth/me").status()).isEqualTo(200);

		client().post("/api/auth/password/reset", Map.of("token", requestToken(email), "password", NEW_PASSWORD));

		assertThat(laptop.get("/api/auth/me").status()).isEqualTo(401);
		assertThat(phone.get("/api/auth/me").status()).isEqualTo(401);
		assertThat(jdbc.queryForObject("select count(*) from spring_session where principal_name = ?", Integer.class,
				email)).isZero();
	}

	@Test
	void tokenIsSingleUse() {
		var email = registered();
		var token = requestToken(email);
		client().post("/api/auth/password/reset", Map.of("token", token, "password", NEW_PASSWORD));

		var again = client().post("/api/auth/password/reset", Map.of("token", token, "password", "Third-pass-789"));

		assertThat(again.status()).isEqualTo(400);
		assertThat(again.json()).containsEntry("code", "INVALID_RESET_TOKEN");
		assertThat(login(email, NEW_PASSWORD)).isEqualTo(200);
	}

	@Test
	void expiredTokenIsRejected() {
		var email = registered();
		var token = requestToken(email);
		jdbc.update("update password_reset_token set expires_at = now() - interval '1 second' where token_hash = ?",
				ResetTokens.hash(token));

		var response = client().post("/api/auth/password/reset", Map.of("token", token, "password", NEW_PASSWORD));

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "INVALID_RESET_TOKEN");
	}

	@Test
	void unknownTokenIsRejected() {
		var response = client().post("/api/auth/password/reset",
				Map.of("token", ResetTokens.generate(), "password", NEW_PASSWORD));

		assertThat(response.status()).isEqualTo(400);
		assertThat(response.json()).containsEntry("code", "INVALID_RESET_TOKEN");
	}

	@Test
	void repeatedRequestsAreThrottledToOneMailPerMinute() {
		var email = registered();

		client().post("/api/auth/password/forgot", Map.of("email", email));
		var second = client().post("/api/auth/password/forgot", Map.of("email", email));

		assertThat(second.status()).isEqualTo(202);
		assertThat(mailer.sentTo(email)).hasSize(1);
	}

	@Test
	void newRequestInvalidatesPreviousLink() {
		var email = registered();
		var first = requestToken(email);
		// минула хвилина — cooldown більше не діє
		jdbc.update("""
				update password_reset_token set created_at = created_at - interval '2 minutes'
				where user_id = (select id from app_user where email = ?)""", email);

		var second = requestToken(email);

		assertThat(second).isNotEqualTo(first);
		assertThat(client().post("/api/auth/password/reset", Map.of("token", first, "password", NEW_PASSWORD)).status())
			.isEqualTo(400);
		assertThat(client().post("/api/auth/password/reset", Map.of("token", second, "password", NEW_PASSWORD))
			.status()).isEqualTo(204);
	}

	@Test
	void weakNewPasswordKeepsTokenUsable() {
		var email = registered();
		var token = requestToken(email);

		var weak = client().post("/api/auth/password/reset", Map.of("token", token, "password", "short"));

		assertThat(weak.status()).isEqualTo(400);
		assertThat(weak.json()).containsEntry("code", "PASSWORD_POLICY");
		assertThat(client().post("/api/auth/password/reset", Map.of("token", token, "password", NEW_PASSWORD))
			.status()).isEqualTo(204);
	}

	@Test
	void validationAndCsrf() {
		assertThat(client().post("/api/auth/password/forgot", Map.of("email", "nope")).json())
			.containsEntry("code", "VALIDATION_FAILED");
		assertThat(client().post("/api/auth/password/reset", Map.of("password", NEW_PASSWORD)).json())
			.containsEntry("errors", Map.of("token", "NotBlank"));
		var client = client();
		client.get("/api/auth/csrf");
		assertThat(client.postRaw("/api/auth/password/forgot", Map.of("email", "a@b.c"), null).status())
			.isEqualTo(403);
	}

	private String registered() {
		var email = TestData.uniqueEmail();
		client().post("/api/auth/register", RegistrationIT.body("Олена Кравченко", email, TestData.PASSWORD));
		return email;
	}

	private String requestToken(String email) {
		int before = mailer.sentTo(email).size();
		assertThat(client().post("/api/auth/password/forgot", Map.of("email", email)).status()).isEqualTo(202);
		var mails = mailer.sentTo(email);
		assertThat(mails).hasSize(before + 1);
		return tokenFrom(mails.getLast());
	}

	private int login(String email, String password) {
		return client().post("/api/auth/login", LoginLogoutIT.login(email, password, false)).status();
	}

	static String tokenFrom(OutgoingMail mail) {
		var matcher = TOKEN.matcher(mail.text());
		assertThat(matcher.find()).as("reset link in mail text").isTrue();
		return matcher.group(1);
	}

}
