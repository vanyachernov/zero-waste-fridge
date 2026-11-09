package ua.zwf.api.shopping;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import ua.zwf.api.common.Coded;
import ua.zwf.api.product.ProductCategory;

/** Налаштування Smart Sync домогосподарства (B-43). */
@Entity
@Table(name = "shopping_settings")
public class ShoppingSettings {

	public static final boolean DEFAULT_AUTO_REFILL = true;

	@Id
	@Column(name = "household_id")
	private UUID householdId;

	@Column(name = "auto_refill", nullable = false)
	private boolean autoRefill;

	@Column(name = "excluded_categories", nullable = false, length = 120)
	private String excludedCategories;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected ShoppingSettings() {
	}

	public ShoppingSettings(UUID householdId) {
		this.householdId = householdId;
		this.autoRefill = DEFAULT_AUTO_REFILL;
		this.excludedCategories = "";
	}

	public void update(boolean autoRefill, Set<ProductCategory> excluded, Instant now) {
		this.autoRefill = autoRefill;
		// Порядок оголошення переліку — стабільний рядок незалежно від порядку в запиті
		this.excludedCategories = EnumSet.copyOf(excluded.isEmpty() ? EnumSet.noneOf(ProductCategory.class) : excluded)
			.stream()
			.map(ProductCategory::code)
			.collect(Collectors.joining(","));
		this.updatedAt = ShoppingItem.db(now);
	}

	public boolean refills(ProductCategory category) {
		return autoRefill && !excluded().contains(category);
	}

	public boolean isAutoRefill() {
		return autoRefill;
	}

	public Set<ProductCategory> excluded() {
		if (excludedCategories == null || excludedCategories.isBlank()) {
			return EnumSet.noneOf(ProductCategory.class);
		}
		return Arrays.stream(excludedCategories.split(","))
			.map(code -> Coded.of(ProductCategory.class, code))
			.collect(Collectors.toCollection(() -> EnumSet.noneOf(ProductCategory.class)));
	}

	public UUID getHouseholdId() {
		return householdId;
	}

}
