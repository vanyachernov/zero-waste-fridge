package ua.zwf.api.mail;

/** Відправка листів. Реалізації: {@link SmtpMailer} (SMTP) і {@link LoggingMailer} (SMTP не налаштовано). */
public interface Mailer {

	/** @throws org.springframework.mail.MailException якщо лист не вдалося відправити */
	void send(OutgoingMail mail);

}
