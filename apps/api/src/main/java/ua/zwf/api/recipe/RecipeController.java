package ua.zwf.api.recipe;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;
import ua.zwf.api.recipe.RecipeResponses.CookResult;
import ua.zwf.api.recipe.RecipeResponses.RecipeCard;
import ua.zwf.api.recipe.RecipeResponses.RecipeDetail;

@Tag(name = "recipes")
@RestController
@RequestMapping("/api/recipes")
class RecipeController {

	private final RecipeService service;

	private final CurrentHousehold household;

	RecipeController(RecipeService service, CurrentHousehold household) {
		this.service = service;
		this.household = household;
	}

	@Operation(summary = "Recipes that use products from the fridge, critical (≤ 48 h) first")
	@GetMapping("/recommended")
	List<RecipeCard> recommended(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(defaultValue = "critical") String sort, @RequestParam(defaultValue = "6") int limit) {
		RecipeService.Sort order;
		try {
			order = RecipeService.Sort.valueOf(sort.strip().toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException ex) {
			order = RecipeService.Sort.CRITICAL;
		}
		return service.recommended(household.idOf(principal.id()), order, limit);
	}

	@Operation(summary = "Generate a recipe from 3–4 selected products (DeepSeek when configured, else the catalog)")
	@PostMapping("/generate")
	RecipeDetail generate(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) RecipeService.GenerateRequest request) {
		return service.generate(household.idOf(principal.id()), request);
	}

	@Operation(summary = "Recipe details against the current fridge")
	@GetMapping("/{id}")
	RecipeDetail get(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		return service.detail(household.idOf(principal.id()), id);
	}

	@Operation(summary = "Cook: write off the used products (outcome COOKED) for the given portions")
	@PostMapping("/{id}/cook")
	CookResult cook(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id,
			@RequestBody(required = false) RecipeService.CookRequest request) {
		return service.cook(household.idOf(principal.id()), principal.id(), id, request);
	}

}
