package ua.zwf.api.shopping;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "shopping-list")
@RestController
@RequestMapping("/api/shopping-list")
class ShoppingListController {

	private final ShoppingListService service;

	private final CurrentHousehold household;

	ShoppingListController(ShoppingListService service, CurrentHousehold household) {
		this.service = service;
		this.household = household;
	}

	@Operation(summary = "Shared shopping list: to buy and bought")
	@GetMapping
	ShoppingListResponse list(@AuthenticationPrincipal AppUserPrincipal principal) {
		return service.list(household.idOf(principal.id()));
	}

	@Operation(summary = "Add an item")
	@PostMapping
	ResponseEntity<ShoppingItemResponse> create(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody ShoppingItemInput input) {
		var created = service.create(household.idOf(principal.id()), principal.id(), input);
		return ResponseEntity.created(URI.create("/api/shopping-list/" + created.id())).body(created);
	}

	@Operation(summary = "Edit an item (quantity −/+, priority, price…)")
	@PatchMapping("/{id}")
	ShoppingItemResponse update(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id,
			@RequestBody ShoppingItemInput input) {
		return service.update(household.idOf(principal.id()), id, input);
	}

	/** Буквальний шлях має пріоритет над {@code /{id}}, тож «bought» не сприймається як id. */
	@Operation(summary = "Clear bought items")
	@DeleteMapping("/bought")
	ClearedResponse clearBought(@AuthenticationPrincipal AppUserPrincipal principal) {
		return new ClearedResponse(service.clearBought(household.idOf(principal.id())));
	}

	record ClearedResponse(int deleted) {
	}

	@Operation(summary = "Remove an item")
	@DeleteMapping("/{id}")
	ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		service.delete(household.idOf(principal.id()), id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Mark bought / not bought")
	@PostMapping("/{id}/toggle")
	ShoppingItemResponse toggle(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		return service.toggle(household.idOf(principal.id()), principal.id(), id);
	}

}
