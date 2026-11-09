package ua.zwf.api.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/** Створення продуктів через API для інтеграційних тестів інших модулів (поради, рецепти, покупки). */
public final class Products {

	/** «Сьогодні» в поясі користувачів, як рахує бекенд (zwf.time-zone). */
	public static final LocalDate TODAY = LocalDate.now(ZoneId.of("Europe/Kyiv"));

	private Products() {
	}

	public static Map<String, Object> product(String name, String category, int daysLeft) {
		var body = new HashMap<String, Object>();
		body.put("name", name);
		body.put("category", category);
		body.put("quantity", 1);
		body.put("unit", "pcs");
		body.put("expiresAt", TODAY.plusDays(daysLeft).toString());
		return body;
	}

	public static Map<String, Object> create(ApiClient client, Map<String, Object> body) {
		var response = client.post("/api/products", body);
		assertThat(response.status()).as(response.body()).isEqualTo(201);
		return response.json();
	}

}
