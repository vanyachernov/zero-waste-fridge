package ua.zwf.api.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Запасний варіант без SMTP: лист не відправляється, а потрапляє в лог.
 * Повний текст (з посиланнями-токенами!) пишемо лише якщо явно дозволено ({@code zwf.mail.log-content}, dev).
 */
public class LoggingMailer implements Mailer {

	private static final Logger log = LoggerFactory.getLogger(LoggingMailer.class);

	private final boolean logContent;

	public LoggingMailer(boolean logContent) {
		this.logContent = logContent;
	}

	@Override
	public void send(OutgoingMail mail) {
		if (logContent) {
			log.warn("SMTP is not configured, mail NOT sent. To: {}, subject: {}\n{}", mail.to(), mail.subject(),
					mail.text());
		}
		else {
			log.error("SMTP is not configured, mail NOT sent. To: {}, subject: {}", mail.to(), mail.subject());
		}
	}

	boolean logsContent() {
		return logContent;
	}

}
