package ua.zwf.api.recipe;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** B-20: рецепт каталогу або згенерований AI (B-22). */
@Entity
@Table(name = "recipe")
public class Recipe {

	@Id
	private UUID id;

	@Column(name = "household_id")
	private UUID householdId;

	@Column(length = 80, unique = true)
	private String slug;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 8)
	private RecipeSource source;

	@Column(nullable = false, length = 160)
	private String title;

	@Column(length = 600)
	private String description;

	@Column(name = "image_url", length = 512)
	private String imageUrl;

	@Column(nullable = false)
	private short minutes;

	@Column(nullable = false)
	private short kcal;

	@Column(nullable = false)
	private short servings;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 8)
	private Difficulty difficulty;

	@Column(name = "savings_uah")
	private Integer savingsUah;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "recipe_ingredient", joinColumns = @JoinColumn(name = "recipe_id"))
	@OrderColumn(name = "position")
	private List<RecipeIngredient> ingredients = new ArrayList<>();

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "recipe_step", joinColumns = @JoinColumn(name = "recipe_id"))
	@OrderColumn(name = "position")
	private List<RecipeStep> steps = new ArrayList<>();

	protected Recipe() {
	}

	private Recipe(UUID householdId, String slug, RecipeSource source, Details details, Instant now) {
		this.id = UUID.randomUUID();
		this.householdId = householdId;
		this.slug = slug;
		this.source = source;
		this.title = details.title();
		this.description = details.description();
		this.imageUrl = details.imageUrl();
		this.minutes = (short) details.minutes();
		this.kcal = (short) details.kcal();
		this.servings = (short) details.servings();
		this.difficulty = details.difficulty();
		this.savingsUah = details.savingsUah();
		this.createdAt = now.truncatedTo(ChronoUnit.MICROS);
		this.ingredients = new ArrayList<>(details.ingredients());
		this.steps = new ArrayList<>(details.steps());
	}

	/** Спільні поля каталожного й згенерованого рецепта. */
	public record Details(String title, String description, String imageUrl, int minutes, int kcal, int servings,
			Difficulty difficulty, Integer savingsUah, List<RecipeIngredient> ingredients, List<RecipeStep> steps) {
	}

	public static Recipe catalog(String slug, Details details, Instant now) {
		return new Recipe(null, slug, RecipeSource.CATALOG, details, now);
	}

	public static Recipe generated(UUID householdId, Details details, Instant now) {
		return new Recipe(householdId, null, RecipeSource.AI, details, now);
	}

	/** Каталог бачать усі, згенерований — лише його сім'я. */
	public boolean visibleTo(UUID householdId) {
		return source == RecipeSource.CATALOG || householdId.equals(this.householdId);
	}

	public UUID getId() {
		return id;
	}

	public UUID getHouseholdId() {
		return householdId;
	}

	public String getSlug() {
		return slug;
	}

	public RecipeSource getSource() {
		return source;
	}

	public String getTitle() {
		return title;
	}

	public String getDescription() {
		return description;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public int getMinutes() {
		return minutes;
	}

	public int getKcal() {
		return kcal;
	}

	public int getServings() {
		return servings;
	}

	public Difficulty getDifficulty() {
		return difficulty;
	}

	public Integer getSavingsUah() {
		return savingsUah;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public List<RecipeIngredient> getIngredients() {
		return List.copyOf(ingredients);
	}

	public List<RecipeStep> getSteps() {
		return List.copyOf(steps);
	}

}
