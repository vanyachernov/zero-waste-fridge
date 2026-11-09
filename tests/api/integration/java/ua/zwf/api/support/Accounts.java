package ua.zwf.api.support;

import java.util.Map;

/** Швидке створення користувачів для інтеграційних тестів доменних API. */
public final class Accounts {

	private Accounts() {
	}

	/** Реєструє нового користувача (зі своїм домогосподарством) і повертає залогінений клієнт. */
	public static ApiClient signUp(ApiClient client, String name) {
		var response = client.post("/api/auth/register",
				Map.of("name", name, "email", TestData.uniqueEmail(), "password", TestData.PASSWORD));
		if (response.status() != 201 && response.status() != 200) {
			throw new IllegalStateException("Registration failed: " + response.status() + " " + response.body());
		}
		return client;
	}

}
