package ua.zwf.api.support;

import org.springframework.boot.SpringApplication;
import ua.zwf.api.ApiApplication;

/** Запуск застосунку з Postgres у Testcontainers — без compose.yaml (зручно з IDE). */
public class TestApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(ApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
