package ua.zwf.api.support;

import java.util.UUID;

/** Генератори унікальних тестових даних — тести не заважають один одному без очищення БД. */
public final class TestData {

	public static final String PASSWORD = "Secret-pass-123";

	private TestData() {
	}

	public static String uniqueEmail() {
		return "user-" + UUID.randomUUID() + "@example.test";
	}

}
