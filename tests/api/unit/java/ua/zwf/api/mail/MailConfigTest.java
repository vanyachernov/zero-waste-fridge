package ua.zwf.api.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.mail.javamail.JavaMailSender;
import ua.zwf.api.config.ZwfProperties;

class MailConfigTest {

	private final MailConfig config = new MailConfig();

	@Test
	void usesSmtpWhenMailSenderIsConfigured() {
		var factory = new StaticListableBeanFactory();
		factory.addBean("mailSender", mock(JavaMailSender.class));

		var mailer = config.mailer(factory.getBeanProvider(JavaMailSender.class), new ZwfProperties(null, null, null));

		assertThat(mailer).isInstanceOf(SmtpMailer.class);
	}

	@Test
	void fallsBackToLoggingWithoutSmtpAndRespectsLogContentFlag() {
		var factory = new StaticListableBeanFactory();
		var props = new ZwfProperties(null, new ZwfProperties.Mail(null, true), null);

		var mailer = config.mailer(factory.getBeanProvider(JavaMailSender.class), props);

		assertThat(mailer).isInstanceOfSatisfying(LoggingMailer.class, m -> assertThat(m.logsContent()).isTrue());
		mailer.send(new OutgoingMail("a@b.c", "S", "T", null));
	}

}
