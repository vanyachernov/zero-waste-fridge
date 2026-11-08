package ua.zwf.api.auth;

import java.util.Locale;

public final class Emails {

	private Emails() {
	}

	/** Email зберігаємо і шукаємо в одному вигляді: без пробілів по краях, у нижньому регістрі. */
	public static String normalize(String email) {
		return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
	}

}
