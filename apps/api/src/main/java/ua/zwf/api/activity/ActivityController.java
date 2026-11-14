package ua.zwf.api.activity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "household")
@RestController
@RequestMapping("/api/household/activity")
class ActivityController {

	private final ActivityService activity;

	private final CurrentHousehold household;

	ActivityController(ActivityService activity, CurrentHousehold household) {
		this.activity = activity;
		this.household = household;
	}

	@Operation(summary = "Household activity, newest first; pass nextBefore as before for older entries")
	@GetMapping
	ActivityPage feed(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(required = false) Instant before,
			@RequestParam(defaultValue = "" + ActivityService.DEFAULT_LIMIT) int limit) {
		return activity.feed(household.idOf(principal.id()), before, limit);
	}

}
