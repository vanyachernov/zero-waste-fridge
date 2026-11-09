package ua.zwf.api.product;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import ua.zwf.api.common.Coded;

/** Стан терміну за кількістю днів до {@code effectiveExpiresAt}: як бейджі FreshnessBadge у UI-Kit. */
public enum Freshness implements Coded {

	EXPIRED("expired"),
	TODAY("today"),
	SOON("soon"),
	FRESH("fresh");

	private final String code;

	Freshness(String code) {
		this.code = code;
	}

	@Override
	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static Freshness fromCode(String code) {
		return Coded.of(Freshness.class, code);
	}

	/** «Скоро» — до 48 годин: завтра або післязавтра. */
	public static final int SOON_MAX_DAYS = 2;

	public static Freshness of(long daysLeft) {
		if (daysLeft < 0) {
			return EXPIRED;
		}
		if (daysLeft == 0) {
			return TODAY;
		}
		return daysLeft <= SOON_MAX_DAYS ? SOON : FRESH;
	}

}
