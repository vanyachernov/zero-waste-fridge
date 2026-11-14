package ua.zwf.api.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpMailerTest {

	private final JavaMailSender sender = mock(JavaMailSender.class);

	private final MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));

	private final SmtpMailer mailer = new SmtpMailer(sender, "Zero Waste Fridge <no-reply@zwf.app>");

	@Test
	void sendsMultipartUtf8MailWithFromToSubject() throws Exception {
		when(sender.createMimeMessage()).thenReturn(message);

		mailer.send(new OutgoingMail("olena@example.com", "Відновлення пароля", "Текст", "<p>HTML</p>"));

		verify(sender).send(message);
		assertThat(((InternetAddress) message.getFrom()[0]).getAddress()).isEqualTo("no-reply@zwf.app");
		assertThat(message.getAllRecipients()).extracting(Object::toString).containsExactly("olena@example.com");
		assertThat(message.getSubject()).isEqualTo("Відновлення пароля");
		assertThat(message.getContent()).isInstanceOf(Multipart.class);
	}

	@Test
	void plainTextOnlyWhenNoHtml() throws Exception {
		when(sender.createMimeMessage()).thenReturn(message);

		mailer.send(new OutgoingMail("a@b.c", "S", "Лише текст", null));

		message.saveChanges();
		assertThat(message.getContent()).isEqualTo("Лише текст");
		assertThat(message.getContentType()).contains("text/plain").containsIgnoringCase("UTF-8");
	}

}
