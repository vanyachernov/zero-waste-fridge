package ua.zwf.api.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Час — через бін, щоб у тестах його можна було зафіксувати. */
@Configuration(proxyBeanMethods = false)
public class ClockConfig {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

}
