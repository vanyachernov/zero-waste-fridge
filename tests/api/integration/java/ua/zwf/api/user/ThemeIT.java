package ua.zwf.api.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.TestData;

/** F-90: тема в профілі переходить між пристроями. */
class ThemeIT extends IntegrationTest {

	@Test
	void savedThemeComesBackOnAnotherDevice() {
		String email = TestData.uniqueEmail();
		var laptop = Accounts.signUp(client(), "Олена", email);
		assertThat(laptop.get("/api/auth/me").json()).containsEntry("theme", "system");

		assertThat(laptop.send("PUT", "/api/me/theme", Map.of("theme", "dark")).status()).isEqualTo(204);

		var phone = client();
		var login = phone.post("/api/auth/login", Map.of("email", email, "password", TestData.PASSWORD, "rememberMe", false));
		assertThat(login.json()).containsEntry("theme", "dark");

		phone.send("PUT", "/api/me/theme", Map.of("theme", "system"));
		assertThat(laptop.get("/api/auth/me").json()).containsEntry("theme", "system");
	}

	@Test
	void validatesAndRequiresSession() {
		var client = Accounts.signUp(client(), "Олена");
		var bad = client.send("PUT", "/api/me/theme", Map.of("theme", "sepia"));
		assertThat(bad.status()).isEqualTo(400);
		assertThat(bad.json()).containsEntry("errors", Map.of("theme", "INVALID"));

		assertThat(client().send("PUT", "/api/me/theme", Map.of("theme", "dark")).status()).isIn(401, 403);
	}

}
