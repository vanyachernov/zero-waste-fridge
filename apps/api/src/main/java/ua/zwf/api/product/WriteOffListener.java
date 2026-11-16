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
	 * @param requested галочка «Додати до списку покупок»: {@code true} — додати, {@code false} — явно ні (Smart
	 *     Sync теж не додає), {@code null} — вирішує Smart Sync
	 * @return позиція є в списку покупок (створена або вже була)
	 */
	boolean afterWriteOff(Product product, UUID userId, WriteOffOutcome outcome, BigDecimal written,
			Boolean requested);

}
