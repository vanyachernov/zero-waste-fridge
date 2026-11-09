package ua.zwf.api.household;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Optional;

/**
 * Код сім'ї {@code ZWF-XXXX-XX}: 6 символів з алфавіту без схожих 0/O, 1/I/L — ≈ 2^30 варіантів.
 * Користувач може ввести його з малими літерами, пробілами чи без префікса.
 */
public final class JoinCodes {

	static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

	private static final SecureRandom RANDOM = new SecureRandom();

	private JoinCodes() {
	}

	public static String generate() {
		var chars = new StringBuilder(6);
		for (int i = 0; i < 6; i++) {
			chars.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
		}
		return format(chars.toString());
	}

	/** «zwf 4821 kr», «ZWF-4821-KR», «4821KR» → «ZWF-4821-KR»; інше — порожньо. */
	public static Optional<String> normalize(String input) {
		if (input == null) {
			return Optional.empty();
		}
		String compact = input.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
		if (compact.startsWith("ZWF") && compact.length() == 9) {
			compact = compact.substring(3);
		}
		if (compact.length() != 6) {
			return Optional.empty();
		}
		return Optional.of(format(compact));
	}

	private static String format(String six) {
		return "ZWF-" + six.substring(0, 4) + "-" + six.substring(4);
	}

}
