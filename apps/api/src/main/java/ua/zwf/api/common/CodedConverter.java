package ua.zwf.api.common;

import jakarta.persistence.AttributeConverter;

/** JPA: зберігає {@link Coded}-перелік як його код. Підкласи позначаються {@code @Converter(autoApply = true)}. */
public abstract class CodedConverter<E extends Enum<E> & Coded> implements AttributeConverter<E, String> {

	private final Class<E> type;

	protected CodedConverter(Class<E> type) {
		this.type = type;
	}

	@Override
	public String convertToDatabaseColumn(E value) {
		return value == null ? null : value.code();
	}

	@Override
	public E convertToEntityAttribute(String code) {
		return code == null ? null : Coded.of(type, code);
	}

}
