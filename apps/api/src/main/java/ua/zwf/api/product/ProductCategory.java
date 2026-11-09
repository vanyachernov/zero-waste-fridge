package ua.zwf.api.product;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.Converter;
import ua.zwf.api.common.Coded;
import ua.zwf.api.common.CodedConverter;

/** Категорія продукту (чіпи фільтра на екрані «Мій холодильник»). */
public enum ProductCategory implements Coded {

	VEGETABLES("vegetables"),
	DAIRY("dairy"),
	MEAT("meat"),
	FRUITS("fruits"),
	SAUCES("sauces"),
	OTHER("other");

	private final String code;

	ProductCategory(String code) {
		this.code = code;
	}

	@Override
	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static ProductCategory fromCode(String code) {
		return Coded.of(ProductCategory.class, code);
	}

	@Converter(autoApply = true)
	static class JpaConverter extends CodedConverter<ProductCategory> {

		JpaConverter() {
			super(ProductCategory.class);
		}

	}

}
