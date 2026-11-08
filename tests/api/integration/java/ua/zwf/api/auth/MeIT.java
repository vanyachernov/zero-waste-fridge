package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.TestData;

/** B-05: GET /api/auth/me. */
class MeIT extends IntegrationTest {

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void anonymousGets401() {
		assertThat(client().get("/api/auth/me").status()).isEqualTo(401);
	}

	@Test
	void returnsProfileOfSignedInUser() {
		var client = client();
		var registered = client.post("/api/auth/register",
				RegistrationIT.body("Олена Кравченко", TestData.uniqueEmail(), TestData.PASSWORD)).json();

		var me = client.get("/api/auth/me");

		assertThat(me.status()).isEqualTo(200);
		assertThat(me.json()).isEqualTo(registered);
	}

	@Test
	void sessionIsBoundToItsOwnBrowserOnly() {
		var olena = client();
		olena.post("/api/auth/register", RegistrationIT.body("Олена", TestData.uniqueEmail(), TestData.PASSWORD));

		assertThat(client().get("/api/auth/me").status()).isEqualTo(401);
	}

	@Test
	void reflectsChangesMadeAfterSignIn() {
		var client = client();
		var email = TestData.uniqueEmail();
		client.post("/api/auth/register", RegistrationIT.body("Олена", email, TestData.PASSWORD));

		jdbc.update("update app_user set name = ? where email = ?", "Олена Кравченко-Шевченко", email);
		jdbc.update("""
				update household_member set role = 'MEMBER'
				where user_id = (select id from app_user where email = ?)""", email);

		assertThat(client.get("/api/auth/me").json()).containsEntry("name", "Олена Кравченко-Шевченко")
			.containsEntry("role", "MEMBER");
	}

	@Test
	void deletedUserGets401AndSessionIsDestroyed() {
		var client = client();
		var email = TestData.uniqueEmail();
		client.post("/api/auth/register", RegistrationIT.body("Олена", email, TestData.PASSWORD));

		jdbc.update("delete from app_user where email = ?", email);
		var first = client.get("/api/auth/me");

		assertThat(first.status()).isEqualTo(401);
		assertThat(first.json()).containsEntry("code", "SESSION_EXPIRED");
		assertThat(jdbc.queryForObject("select count(*) from spring_session where principal_name = ?", Integer.class,
				email)).isZero();
		client.dropSessionCookies(List.of(ApiClient.SESSION_COOKIE));
		assertThat(client.get("/api/auth/me").status()).isEqualTo(401);
	}

}
