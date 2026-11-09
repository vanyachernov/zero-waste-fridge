package ua.zwf.api.product;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.Converter;
import ua.zwf.api.common.Coded;
import ua.zwf.api.common.CodedConverter;

/** Зона зберігання в холодильнику (картки зон під таблицею). */
public enum StorageZone implements Coded {

	FRESH("fresh"),
	MIDDLE("middle"),
	DOOR("door"),
	FREEZER("freezer");

	private final String code;

	StorageZone(String code) {
		this.code = code;
	}

	@Override
	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static StorageZone fromCode(String code) {
		return Coded.of(StorageZone.class, code);
	}

	@Converter(autoApply = true)
	static class JpaConverter extends CodedConverter<StorageZone> {

		JpaConverter() {
			super(StorageZone.class);
		}

	}

}
