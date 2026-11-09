package ua.zwf.api.shopping;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.Unit;

/** Тіло POST / PATCH позиції. Як і в продуктах: відсутнє поле — без змін, {@code null} — очистити. */
public class ShoppingItemInput {

	private final Set<String> present = new HashSet<>();

	private String name;

	private BigDecimal quantity;

	private Unit unit;

	private ProductCategory category;

	private ShoppingPriority priority;

	private BigDecimal priceEstimate;

	private UUID storeId;

	public boolean has(String field) {
		return present.contains(field);
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		present.add("name");
		this.name = name;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public void setQuantity(BigDecimal quantity) {
		present.add("quantity");
		this.quantity = quantity;
	}

	public Unit getUnit() {
		return unit;
	}

	public void setUnit(Unit unit) {
		present.add("unit");
		this.unit = unit;
	}

	public ProductCategory getCategory() {
		return category;
	}

	public void setCategory(ProductCategory category) {
		present.add("category");
		this.category = category;
	}

	public ShoppingPriority getPriority() {
		return priority;
	}

	public void setPriority(ShoppingPriority priority) {
		present.add("priority");
		this.priority = priority;
	}

	public BigDecimal getPriceEstimate() {
		return priceEstimate;
	}

	public void setPriceEstimate(BigDecimal priceEstimate) {
		present.add("priceEstimate");
		this.priceEstimate = priceEstimate;
	}

	public UUID getStoreId() {
		return storeId;
	}

	public void setStoreId(UUID storeId) {
		present.add("storeId");
		this.storeId = storeId;
	}

}
