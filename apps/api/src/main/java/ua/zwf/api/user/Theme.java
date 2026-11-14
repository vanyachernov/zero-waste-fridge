package ua.zwf.api.user;

import java.util.Locale;
import java.util.Optional;

/** F-90: тема інтерфейсу. {@code SYSTEM} у БД — {@code NULL} (як у налаштуваннях пристрою). */
public enum Theme {

	LIGHT, DARK, SYSTEM;

	/** У API — малими літерами: {@code light | dark | system}. */
	public String api() {
		return name().toLowerCase(Locale.ROOT);
	}

	public static Optional<Theme> parse(String value) {
		if (value == null) {
			return Optional.empty();
		}
		return switch (value.strip().toLowerCase(Locale.ROOT)) {
			case "light" -> Optional.of(LIGHT);
			case "dark" -> Optional.of(DARK);
			case "system" -> Optional.of(SYSTEM);
			default -> Optional.empty();
		};
	}

}
