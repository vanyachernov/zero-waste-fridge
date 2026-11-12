package ua.zwf.api.recipe;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** «Легко / Середня / Складно». У API — {@code easy | medium | hard}. */
public enum Difficulty {

	EASY, MEDIUM, HARD;

	@JsonValue
	public String api() {
		return name().toLowerCase(Locale.ROOT);
	}

	@JsonCreator
	public static Difficulty parse(String value) {
		return value == null ? null : valueOf(value.strip().toUpperCase(Locale.ROOT));
	}

}
