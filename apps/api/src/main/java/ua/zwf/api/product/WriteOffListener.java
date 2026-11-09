package ua.zwf.api.product;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Що робити після списання (реалізує модуль списку покупок). Окремий інтерфейс, щоб продукти не залежали
 * від пакета {@code shopping}: B-13 «Додати … до списку покупок», далі B-43 Smart Sync.
 */
public interface WriteOffListener {

	/**
	 * @param written скільки списано (в одиницях продукту)
	 * @param requested користувач поставив «Додати до списку покупок»
	 * @return позиція є в списку покупок (створена або вже була)
	 */
	boolean afterWriteOff(Product product, UUID userId, WriteOffOutcome outcome, BigDecimal written,
			boolean requested);

}
