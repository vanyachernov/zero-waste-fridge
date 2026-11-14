package ua.zwf.api.shopping;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "shopping-list")
@RestController
@RequestMapping("/api/shopping-list/stores")
class StoreController {

	private final StoreService stores;

	private final CurrentHousehold household;

	StoreController(StoreService stores, CurrentHousehold household) {
		this.stores = stores;
		this.household = household;
	}

	record CreateStoreRequest(String name) {
	}

	@Operation(summary = "Household stores, alphabetically")
	@GetMapping
	List<StoreService.StoreResponse> list(@AuthenticationPrincipal AppUserPrincipal principal) {
		return stores.list(household.idOf(principal.id()));
	}

	@Operation(summary = "Add a store (409 STORE_EXISTS for a duplicate name)")
	@PostMapping
	ResponseEntity<StoreService.StoreResponse> create(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody CreateStoreRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(stores.create(household.idOf(principal.id()), request.name()));
	}

	@Operation(summary = "Remove a store; its items stay without a store")
	@DeleteMapping("/{id}")
	ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		stores.delete(household.idOf(principal.id()), id);
		return ResponseEntity.noContent().build();
	}

}
