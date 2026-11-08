package ua.zwf.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Метадані OpenAPI. Специфікація: {@code /v3/api-docs} — джерело для orval у {@code packages/api-client}. */
@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI zwfOpenApi() {
		return new OpenAPI()
			.info(new Info()
				.title("Zero Waste Fridge API")
				.version("0.1.0")
				.description("Сесійна автентифікація через HttpOnly-cookie. Усі ендпоінти під /api."))
			.servers(List.of(new Server().url("/")));
	}

}
