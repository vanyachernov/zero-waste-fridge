package ua.zwf.api.product;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.Converter;
import ua.zwf.api.common.Coded;
import ua.zwf.api.common.CodedConverter;

/** Одиниця кількості (сегмент «г / кг / мл / л / шт» у модалці). */
public enum Unit implements Coded {

	GRAMS("g"),
	KILOGRAMS("kg"),
	MILLILITERS("ml"),
	LITERS("l"),
	PIECES("pcs");

	private final String code;

	Unit(String code) {
		this.code = code;
	}

	@Override
	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static Unit fromCode(String code) {
		return Coded.of(Unit.class, code);
	}

	@Converter(autoApply = true)
	static class JpaConverter extends CodedConverter<Unit> {

		JpaConverter() {
			super(Unit.class);
		}

	}

}
