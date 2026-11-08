package ua.zwf.api;

import org.springframework.boot.SpringApplication;

/** Запуск застосунку з Postgres у Testcontainers — без compose.yaml. */
public class TestApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(ApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
