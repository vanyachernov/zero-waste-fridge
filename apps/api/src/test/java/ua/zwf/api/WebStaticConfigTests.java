package ua.zwf.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/** D-02: використовує фейкову статику з src/test/resources/static. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("test")
class WebStaticConfigTests {

	@Autowired
	WebApplicationContext context;

	MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
	}

	@Test
	void publicIndex() throws Exception {
		// "/" обробляє welcome-page маппінг Spring Boot (forward:index.html) — MockMvc форварди не виконує
		mvc.perform(get("/")).andExpect(status().isOk()).andExpect(forwardedUrl("index.html"));
		mvc.perform(get("/index.html"))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("PUBLIC-INDEX")))
			.andExpect(header().string("Cache-Control", containsString("no-cache")));
	}

	@Test
	void publicDirectoryIndexWithAndWithoutTrailingSlash() throws Exception {
		mvc.perform(get("/about/")).andExpect(status().isOk()).andExpect(content().string(containsString("ABOUT-INDEX")));
		mvc.perform(get("/about")).andExpect(status().isOk()).andExpect(content().string(containsString("ABOUT-INDEX")));
	}

	@Test
	void lmsRootServesSpa() throws Exception {
		mvc.perform(get("/lms/")).andExpect(status().isOk()).andExpect(content().string(containsString("LMS-INDEX")));
		mvc.perform(get("/lms")).andExpect(status().isOk()).andExpect(content().string(containsString("LMS-INDEX")));
	}

	@Test
	void lmsClientRoutesFallBackToIndex() throws Exception {
		mvc.perform(get("/lms/recipes")).andExpect(status().isOk()).andExpect(content().string(containsString("LMS-INDEX")));
		mvc.perform(get("/lms/recipes/r1?ids=p1")).andExpect(status().isOk()).andExpect(content().string(containsString("LMS-INDEX")));
	}

	@Test
	void hashedAssetsAreImmutable() throws Exception {
		mvc.perform(get("/lms/assets/index-abc123.js"))
			.andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", containsString("immutable")));
		mvc.perform(get("/_next/static/chunks/main-xyz.js"))
			.andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", containsString("max-age=31536000")));
	}

	@Test
	void missingAssetIs404NotIndex() throws Exception {
		mvc.perform(get("/lms/assets/missing.js")).andExpect(status().isNotFound());
		mvc.perform(get("/lms/missing.css")).andExpect(status().isNotFound());
	}

	@Test
	void unknownPublicPageIs404() throws Exception {
		mvc.perform(get("/does-not-exist/").accept(MediaType.TEXT_HTML)).andExpect(status().isNotFound());
	}

	@Test
	void apiIsNotShadowedByStatic() throws Exception {
		mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
	}

}
