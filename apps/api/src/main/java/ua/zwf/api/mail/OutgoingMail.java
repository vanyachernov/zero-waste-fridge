package ua.zwf.api.mail;

import java.util.Objects;

/** Лист: обов'язкова текстова версія + необов'язкова HTML. */
public record OutgoingMail(String to, String subject, String text, String html) {

	public OutgoingMail {
		Objects.requireNonNull(to, "to");
		Objects.requireNonNull(subject, "subject");
		Objects.requireNonNull(text, "text");
	}

}
