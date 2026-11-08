package ua.zwf.api.mail;

import jakarta.mail.MessagingException;
import java.nio.charset.StandardCharsets;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

public class SmtpMailer implements Mailer {

	private final JavaMailSender sender;

	private final String from;

	public SmtpMailer(JavaMailSender sender, String from) {
		this.sender = sender;
		this.from = from;
	}

	@Override
	public void send(OutgoingMail mail) {
		var message = sender.createMimeMessage();
		try {
			var helper = new MimeMessageHelper(message, mail.html() != null, StandardCharsets.UTF_8.name());
			helper.setFrom(from);
			helper.setTo(mail.to());
			helper.setSubject(mail.subject());
			if (mail.html() != null) {
				helper.setText(mail.text(), mail.html());
			}
			else {
				helper.setText(mail.text(), false);
			}
		}
		catch (MessagingException ex) {
			throw new MailPreparationException("Could not prepare mail to " + mail.to(), ex);
		}
		sender.send(message);
	}

}
