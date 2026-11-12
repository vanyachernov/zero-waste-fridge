package ua.zwf.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import ua.zwf.api.support.IntegrationTest;

class ApiApplicationIT extends IntegrationTest {

	MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = mvc();
	}

	@Test
	void contextLoadsAndMigrationsApply() {
		// Падає, якщо Flyway-міграції або ddl-auto=validate не проходять
	}

	@Test
	void healthIsPublic() throws Exception {
		mvc.perform(get("/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void apiRequiresAuthenticationWith401() throws Exception {
		mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
	}

	@Test
	void openApiSpecIsPublic() throws Exception {
		mvc.perform(get("/v3/api-docs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.info.title").value("Zero Waste Fridge API"));
	}

	/** Контракт для orval (I-10, I-40, I-50): ендпоінти холодильника, списку покупок і сім'ї є в специфікації. */
	@Test
	void openApiSpecDescribesFridgeEndpoints() throws Exception {
		mvc.perform(get("/v3/api-docs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.paths['/api/products'].get").exists())
			.andExpect(jsonPath("$.paths['/api/products'].post").exists())
			.andExpect(jsonPath("$.paths['/api/products/{id}'].get").exists())
			.andExpect(jsonPath("$.paths['/api/products/{id}'].patch").exists())
			.andExpect(jsonPath("$.paths['/api/products/{id}/write-off'].post").exists())
			.andExpect(jsonPath("$.paths['/api/products/summary'].get").exists())
			.andExpect(jsonPath("$.paths['/api/tips/today'].get").exists())
			.andExpect(jsonPath("$.paths['/api/dictionaries'].get").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list'].get").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/{id}/toggle'].post").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/bought'].delete").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/move-to-fridge'].post").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/settings'].put").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/stores'].post").exists())
			.andExpect(jsonPath("$.paths['/api/shopping-list/summary'].get").exists())
			.andExpect(jsonPath("$.paths['/api/household'].delete").exists())
			.andExpect(jsonPath("$.paths['/api/household/members/{userId}'].patch").exists())
			.andExpect(jsonPath("$.paths['/api/household/activity'].get").exists())
			.andExpect(jsonPath("$.paths['/api/household/invites'].post").exists())
			.andExpect(jsonPath("$.paths['/api/household/invites/code'].post").exists())
			.andExpect(jsonPath("$.paths['/api/household/join'].post").exists())
			.andExpect(jsonPath("$.paths['/api/notifications'].get").exists())
			.andExpect(jsonPath("$.paths['/api/notifications/read-all'].post").exists())
			.andExpect(jsonPath("$.paths['/api/me/notification-settings'].put").exists())
			.andExpect(jsonPath("$.paths['/api/me/push-subscriptions'].post").exists())
			.andExpect(jsonPath("$.paths['/api/household/stream'].get").exists());
	}

}
