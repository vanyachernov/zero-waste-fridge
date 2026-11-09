package ua.zwf.api.product;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Order;
import ua.zwf.api.common.Coded;

/** Сортування списку продуктів (F-22). */
public enum ProductSort implements Coded {

	/** Спочатку критичні: за effectiveExpiresAt, потім за назвою. */
	EXPIRY("expiry"),
	NAME("name"),
	/** Нові зверху. */
	ADDED("added"),
	CATEGORY("category");

	private final String code;

	ProductSort(String code) {
		this.code = code;
	}

	@Override
	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static ProductSort fromCode(String code) {
		return Coded.of(ProductSort.class, code);
	}

	Sort toSort() {
		var expiry = Order.asc("effectiveExpiresAt");
		var name = Order.asc("name");
		var id = Order.asc("id");
		return switch (this) {
			case EXPIRY -> Sort.by(expiry, name, id);
			case NAME -> Sort.by(name, expiry, id);
			case ADDED -> Sort.by(Order.desc("createdAt"), id);
			case CATEGORY -> Sort.by(Order.asc("category"), expiry, name, id);
		};
	}

}
