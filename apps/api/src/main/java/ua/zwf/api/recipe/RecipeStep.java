package ua.zwf.api.recipe;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Крок приготування: «Крок 1. Підготовка» + текст. */
@Embeddable
public class RecipeStep {

	@Column(length = 120)
	private String title;

	@Column(nullable = false, length = 1000)
	private String text;

	protected RecipeStep() {
	}

	public RecipeStep(String title, String text) {
		this.title = title;
		this.text = text;
	}

	public String getTitle() {
		return title;
	}

	public String getText() {
		return text;
	}

}
