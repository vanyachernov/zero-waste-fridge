package ua.zwf.api.support;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Базовий клас інтеграційних тестів: повний Spring Boot на випадковому порту + PostgreSQL у Testcontainers.
 *
 * <p>Усі нащадки мають однакову конфігурацію, тому Spring кешує один контекст (і один контейнер) на весь прогін.
 * Тести не чистять БД — кожен створює власні дані з унікальними email ({@link TestData}).
 *
 * <ul>
 *   <li>{@link #client()} — справжній HTTP-клієнт з cookie (сесія, CSRF), для перевірки потоків авторизації;</li>
 *   <li>{@link #mvc()} — MockMvc для перевірок маршрутизації / заголовків без мережі.</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({ TestcontainersConfiguration.class, IntegrationTestConfiguration.class })
@ActiveProfiles("test")
public abstract class IntegrationTest {

	@LocalServerPort
	protected int port;

	@Autowired
	protected WebApplicationContext context;

	/** Новий «браузер» з порожнім cookie jar. */
	protected ApiClient client() {
		return new ApiClient(port);
	}

	protected MockMvc mvc() {
		return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
	}

}
