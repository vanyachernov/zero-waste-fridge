package ua.zwf.api.activity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import ua.zwf.api.product.Unit;
import ua.zwf.api.product.WriteOffOutcome;

/**
 * Запис стрічки «Остання дія» (B-53).
 *
 * @param actor хто зробив; {@code null}, якщо акаунт видалено
 * @param subject продукт або позиція списку; {@code id = null}, якщо позицію вже видалено зі списку
 * @param outcome, quantity, unit — лише для списання
 */
public record ActivityEntry(ActivityType type, Instant at, Person actor, Subject subject, WriteOffOutcome outcome,
		BigDecimal quantity, Unit unit) {

	public record Person(UUID id, String name) {
	}

	public enum SubjectKind {

		PRODUCT, SHOPPING_ITEM

	}

	public record Subject(SubjectKind kind, UUID id, String name) {
	}

}
