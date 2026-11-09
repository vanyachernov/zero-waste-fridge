package ua.zwf.api.household;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;

@Tag(name = "household")
@RestController
@RequestMapping("/api/household")
class HouseholdController {

	private final HouseholdService households;

	HouseholdController(HouseholdService households) {
		this.households = households;
	}

	record RenameRequest(String name) {
	}

	@Operation(summary = "Current household with member count, my role and permissions")
	@GetMapping
	HouseholdResponse get(@AuthenticationPrincipal AppUserPrincipal principal) {
		return households.get(principal.id());
	}

	@Operation(summary = "Rename the household (owner only)")
	@PatchMapping
	@RequiresPermission(HouseholdPermission.RENAME_HOUSEHOLD)
	HouseholdResponse rename(@AuthenticationPrincipal AppUserPrincipal principal, @RequestBody RenameRequest request) {
		return households.rename(principal.id(), request.name());
	}

}
