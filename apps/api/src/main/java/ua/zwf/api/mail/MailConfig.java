package ua.zwf.api.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import ua.zwf.api.config.ZwfProperties;

/** SMTP, якщо задано {@code spring.mail.host} (Boot створює JavaMailSender), інакше — лише лог. */
@Configuration(proxyBeanMethods = false)
public class MailConfig {

	@Bean
	Mailer mailer(ObjectProvider<JavaMailSender> sender, ZwfProperties properties) {
		JavaMailSender smtp = sender.getIfAvailable();
		return smtp != null ? new SmtpMailer(smtp, properties.mail().from())
				: new LoggingMailer(properties.mail().logContent());
	}

}
