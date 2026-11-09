package ua.zwf.api.shopping;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "shopping-list")
@RestController
@RequestMapping("/api/shopping-list/settings")
class ShoppingSettingsController {

	private final ShoppingSettingsService settings;

	private final CurrentHousehold household;

	ShoppingSettingsController(ShoppingSettingsService settings, CurrentHousehold household) {
		this.settings = settings;
		this.household = household;
	}

	@Operation(summary = "Smart Sync settings: auto refill on/off and excluded categories")
	@GetMapping
	ShoppingSettingsService.SettingsResponse get(@AuthenticationPrincipal AppUserPrincipal principal) {
		return settings.get(household.idOf(principal.id()));
	}

	@Operation(summary = "Save Smart Sync settings")
	@PutMapping
	ShoppingSettingsService.SettingsResponse put(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody ShoppingSettingsService.SettingsRequest request) {
		return settings.put(household.idOf(principal.id()), request);
	}

}
