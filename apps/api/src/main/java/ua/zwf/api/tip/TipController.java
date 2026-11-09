package ua.zwf.api.tip;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "tips")
@RestController
@RequestMapping("/api/tips")
class TipController {

	private final TipService tips;

	private final CurrentHousehold household;

	TipController(TipService tips, CurrentHousehold household) {
		this.tips = tips;
		this.household = household;
	}

	@Operation(summary = "Tip of the day: products to use within 24 hours and a dish idea")
	@GetMapping("/today")
	TipResponse today(@AuthenticationPrincipal AppUserPrincipal principal) {
		return tips.today(household.idOf(principal.id()));
	}

}
