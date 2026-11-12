package ua.zwf.api.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Спільні тестові біни інтеграційних тестів: фейки зовнішніх сервісів. */
@TestConfiguration(proxyBeanMethods = false)
public class IntegrationTestConfiguration {

	@Bean
	@Primary
	RecordingMailer recordingMailer() {
		return new RecordingMailer();
	}

	@Bean
	@Primary
	RecordingPushSender recordingPushSender() {
		return new RecordingPushSender();
	}

}
