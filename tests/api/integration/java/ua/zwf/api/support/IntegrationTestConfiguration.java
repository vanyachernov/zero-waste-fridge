package ua.zwf.api.support;

import org.springframework.boot.test.context.TestConfiguration;

/** Спільні тестові біни інтеграційних тестів (фейки зовнішніх сервісів додаються тут). */
@TestConfiguration(proxyBeanMethods = false)
public class IntegrationTestConfiguration {

}
