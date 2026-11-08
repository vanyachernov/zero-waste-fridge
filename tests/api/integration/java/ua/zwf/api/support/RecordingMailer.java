package ua.zwf.api.support;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import ua.zwf.api.mail.Mailer;
import ua.zwf.api.mail.OutgoingMail;

/** Фейкова пошта для інтеграційних тестів: листи складаються в пам'ять. */
public class RecordingMailer implements Mailer {

	private final List<OutgoingMail> sent = new CopyOnWriteArrayList<>();

	@Override
	public void send(OutgoingMail mail) {
		sent.add(mail);
	}

	public List<OutgoingMail> sentTo(String email) {
		return sent.stream().filter(m -> m.to().equals(email)).toList();
	}

}
