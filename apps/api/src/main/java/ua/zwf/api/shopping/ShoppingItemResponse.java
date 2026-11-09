package ua.zwf.api.shopping;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;
import ua.zwf.api.user.User;

public record ShoppingItemResponse(UUID id, String name, BigDecimal quantity, Unit unit, ProductCategory category,
		ShoppingPriority priority, BigDecimal priceEstimate, ShoppingSource source, SourceProduct sourceProduct,
		Person addedBy, boolean bought, Instant boughtAt, Person boughtBy, Instant createdAt, Instant updatedAt) {

	/** «Додано Максимом», «Купила Олена». {@code null}, якщо акаунт видалено. */
	public record Person(UUID id, String name) {

		static Person of(User user) {
			return user == null ? null : new Person(user.getId(), user.getName());
		}

	}

	/** Продукт холодильника, після якого з'явилась позиція («Закінчився вчора в холодильнику»). */
	public record SourceProduct(UUID id, String name, Instant closedAt) {
	}

	public static ShoppingItemResponse of(ShoppingItem i) {
		var product = i.getSourceProduct();
		var source = product == null ? null
				: new SourceProduct(product.getId(), product.getName(), product.getClosedAt());
		return new ShoppingItemResponse(i.getId(), i.getName(), plain(i.getQuantity()), i.getUnit(), i.getCategory(),
				i.getPriority(), plain(i.getPriceEstimate()), i.getSource(), source, Person.of(i.getAddedBy()),
				i.isBought(), i.getBoughtAt(), Person.of(i.getBoughtBy()), i.getCreatedAt(), i.getUpdatedAt());
	}

	static BigDecimal plain(BigDecimal value) {
		if (value == null) {
			return null;
		}
		BigDecimal stripped = value.stripTrailingZeros();
		return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
	}

}
