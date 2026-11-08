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

}
