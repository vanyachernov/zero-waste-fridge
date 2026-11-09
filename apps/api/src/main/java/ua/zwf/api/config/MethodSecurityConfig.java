package ua.zwf.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.annotation.AnnotationTemplateExpressionDefaults;

/** B-50: {@code @PreAuthorize} і мета-анотація {@link ua.zwf.api.household.RequiresPermission}. */
@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
class MethodSecurityConfig {

	/** Дозволяє шаблони {@code {value}} у мета-анотаціях над {@code @PreAuthorize}. */
	@Bean
	static AnnotationTemplateExpressionDefaults templateExpressionDefaults() {
		return new AnnotationTemplateExpressionDefaults();
	}

}
