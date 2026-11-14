package ua.zwf.api.common;

import java.util.Arrays;
import java.util.Optional;

/**
 * Перелік із стабільним кодом для API і БД (напр. {@code dairy}, {@code g}). Коди не залежать від імен
 * Java-констант, тож константи можна перейменовувати без міграцій і змін на фронтенді.
 */
public interface Coded {

	String code();

	static <E extends Enum<E> & Coded> Optional<E> find(Class<E> type, String code) {
		if (code == null) {
			return Optional.empty();
		}
		String normalized = code.trim();
		return Arrays.stream(type.getEnumConstants()).filter(e -> e.code().equalsIgnoreCase(normalized)).findFirst();
	}

	static <E extends Enum<E> & Coded> E of(Class<E> type, String code) {
		return find(type, code)
			.orElseThrow(() -> new IllegalArgumentException("Unknown " + type.getSimpleName() + " code: " + code));
	}

}
