package ua.zwf.api.recipe;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import ua.zwf.api.product.Unit;

/** Інгредієнт рецепта. Кількість — на {@link Recipe#getServings()} порцій; без кількості — «за смаком». */
@Embeddable
public class RecipeIngredient {

	@Column(nullable = false, length = 120)
	private String name;

	@Column(precision = 10, scale = 3)
	private BigDecimal quantity;

	@Column(length = 8)
	private Unit unit;

	@Column(length = 120)
	private String note;

	/** Через кому, малими літерами: «шпинат,спінат». */
	@Column(nullable = false, length = 300)
	private String keywords;

	@Column(nullable = false)
	private boolean pantry;

	/** Через «|»: «аквафаба|насіння льону». */
	@Column(length = 300)
	private String substitutes;

	@Column(name = "product_id")
	private UUID productId;

	protected RecipeIngredient() {
	}

	public RecipeIngredient(String name, BigDecimal quantity, Unit unit, String note, List<String> keywords,
			boolean pantry, List<String> substitutes, UUID productId) {
		this.name = name;
		this.quantity = unit == null ? null : quantity;
		this.unit = quantity == null ? null : unit;
		this.note = note;
		this.keywords = String.join(",", keywords.stream().map(k -> k.strip().toLowerCase(Locale.ROOT)).filter(k -> !k.isEmpty()).toList());
		this.pantry = pantry;
		this.substitutes = substitutes == null || substitutes.isEmpty() ? null : String.join("|", substitutes);
		this.productId = productId;
	}

	public String getName() {
		return name;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public Unit getUnit() {
		return unit;
	}

	public String getNote() {
		return note;
	}

	public List<String> getKeywords() {
		return keywords.isEmpty() ? List.of() : Arrays.asList(keywords.split(","));
	}

	public boolean isPantry() {
		return pantry;
	}

	public List<String> getSubstitutes() {
		return substitutes == null ? List.of() : Arrays.asList(substitutes.split("\\|"));
	}

	public UUID getProductId() {
		return productId;
	}

}
