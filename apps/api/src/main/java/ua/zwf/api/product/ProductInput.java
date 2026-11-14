package ua.zwf.api.product;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * Тіло {@code POST} і {@code PATCH /api/products}. Запам'ятовує, які поля прийшли в JSON: для PATCH
 * відсутнє поле — «не змінювати», а явний {@code null} — «очистити» (бренд, дата покупки, відкриття).
 */
public class ProductInput {

	private final Set<String> present = new HashSet<>();

	private String name;

	private String brand;

	private ProductCategory category;

	private StorageZone zone;

	private BigDecimal quantity;

	private Unit unit;

	private LocalDate purchasedAt;

	private LocalDate expiresAt;

	private LocalDate openedAt;

	private Integer remindBeforeDays;

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

	public String getBrand() {
		return brand;
	}

	public void setBrand(String brand) {
		present.add("brand");
		this.brand = brand;
	}

	public ProductCategory getCategory() {
		return category;
	}

	public void setCategory(ProductCategory category) {
		present.add("category");
		this.category = category;
	}

	public StorageZone getZone() {
		return zone;
	}

	public void setZone(StorageZone zone) {
		present.add("zone");
		this.zone = zone;
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

	public LocalDate getPurchasedAt() {
		return purchasedAt;
	}

	public void setPurchasedAt(LocalDate purchasedAt) {
		present.add("purchasedAt");
		this.purchasedAt = purchasedAt;
	}

	public LocalDate getExpiresAt() {
		return expiresAt;
	}

	public void setExpiresAt(LocalDate expiresAt) {
		present.add("expiresAt");
		this.expiresAt = expiresAt;
	}

	public LocalDate getOpenedAt() {
		return openedAt;
	}

	public void setOpenedAt(LocalDate openedAt) {
		present.add("openedAt");
		this.openedAt = openedAt;
	}

	public Integer getRemindBeforeDays() {
		return remindBeforeDays;
	}

	public void setRemindBeforeDays(Integer remindBeforeDays) {
		present.add("remindBeforeDays");
		this.remindBeforeDays = remindBeforeDays;
	}

}
