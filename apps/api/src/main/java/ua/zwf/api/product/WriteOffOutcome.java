package ua.zwf.api.product;

/** «Що сталося з продуктом?» у модалці «Списати продукт». */
public enum WriteOffOutcome {

	/** З'їдено вчасно — «Врятовано». */
	EATEN,
	/** Використано в рецепті. */
	COOKED,
	/** Викинуто — зіпсовано. */
	WASTED;

	/** Статус продукту, коли списано все. */
	ProductStatus closingStatus() {
		return this == WASTED ? ProductStatus.WASTED : ProductStatus.CONSUMED;
	}

}
