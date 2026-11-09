package ua.zwf.api.product;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "products")
@RestController
@RequestMapping("/api/products")
class ProductController {

	private final ProductService service;

	private final CurrentHousehold household;

	ProductController(ProductService service, CurrentHousehold household) {
		this.service = service;
		this.household = household;
	}

	@Operation(summary = "Fridge products: search, filters, sort and pagination (page starts at 1)")
	@GetMapping
	ProductPage list(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(required = false) String q,
			@RequestParam(required = false) List<ProductCategory> category,
			@RequestParam(required = false) List<Freshness> freshness,
			@RequestParam(defaultValue = "ACTIVE") ProductStatus status,
			@RequestParam(defaultValue = "expiry") ProductSort sort,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int size) {
		var filter = new ProductFilter(household.idOf(principal.id()), q,
				category == null ? Set.of() : Set.copyOf(category), freshness == null ? Set.of() : Set.copyOf(freshness),
				status);
		return service.list(filter, sort, page, size);
	}

	@Operation(summary = "Add a product to the fridge")
	@PostMapping
	ResponseEntity<ProductResponse> create(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody ProductInput input) {
		var created = service.create(household.idOf(principal.id()), principal.id(), input);
		return ResponseEntity.created(URI.create("/api/products/" + created.id())).body(created);
	}

	@Operation(summary = "Product details")
	@GetMapping("/{id}")
	ProductResponse get(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		return service.get(household.idOf(principal.id()), id);
	}

	@Operation(summary = "Edit a product; absent fields stay, null clears brand / purchasedAt / openedAt")
	@PatchMapping("/{id}")
	ProductResponse update(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id,
			@RequestBody ProductInput input) {
		return service.update(household.idOf(principal.id()), id, input);
	}

}
