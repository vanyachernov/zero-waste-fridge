package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.IntegrationTest;

/** B-04: CSRF через cookie XSRF-TOKEN + заголовок X-XSRF-TOKEN на справжньому HTTP. */
class CsrfIT extends IntegrationTest {

	@Test
	void csrfEndpointIssuesJsReadableCookie() {
		var client = client();

		var response = client.get("/api/auth/csrf");

		assertThat(response.status()).isEqualTo(204);
		assertThat(response.setCookie(ApiClient.CSRF_COOKIE)).hasValueSatisfying(header -> {
			assertThat(header).contains("Path=/").containsIgnoringCase("SameSite=Lax");
			assertThat(header).doesNotContainIgnoringCase("HttpOnly");
		});
		assertThat(client.csrfToken()).isPresent();
	}

	@Test
	void anyFirstRequestIssuesCookieSoSpaIsReadyAfterPageLoad() {
		var client = client();

		client.get("/lms/");

		assertThat(client.csrfToken()).isPresent();
	}

	@Test
	void tokenIsStableAcrossRequests() {
		var client = client();
		client.get("/api/auth/csrf");
		var first = client.csrfToken().orElseThrow();

		var second = client.get("/api/auth/csrf");

		assertThat(second.setCookie(ApiClient.CSRF_COOKIE)).isEmpty();
		assertThat(client.csrfToken()).contains(first);
	}

	@Test
	void unsafeRequestWithoutHeaderIsRejected() {
		var client = client();
		client.get("/api/auth/csrf");

		var response = client.postRaw("/api/products", Map.of(), null);

		assertThat(response.status()).isEqualTo(403);
	}

	@Test
	void unsafeRequestWithWrongTokenIsRejected() {
		var client = client();
		client.get("/api/auth/csrf");

		var response = client.postRaw("/api/products", Map.of(), "forged-token");

		assertThat(response.status()).isEqualTo(403);
	}

	@Test
	void unsafeRequestWithHeaderWithoutCookieIsRejected() {
		var stranger = client();
		stranger.get("/api/auth/csrf");
		var stolenLooking = stranger.csrfToken().orElseThrow();

		var response = client().postRaw("/api/products", Map.of(), stolenLooking);

		assertThat(response.status()).isEqualTo(403);
	}

	@Test
	void validTokenPassesCsrfAndHitsAuthentication() {
		var response = client().post("/api/products", Map.of());

		// CSRF пропущено — далі спрацьовує автентифікація
		assertThat(response.status()).isEqualTo(401);
	}

	@Test
	void safeMethodsDoNotNeedToken() {
		assertThat(client().get("/api/products").status()).isEqualTo(401);
	}

}
