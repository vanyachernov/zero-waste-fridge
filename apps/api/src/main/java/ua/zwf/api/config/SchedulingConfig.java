package ua.zwf.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** B-31 / B-33: нагадування й дайджест за розкладом. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
class SchedulingConfig {
}
