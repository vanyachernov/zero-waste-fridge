package ua.zwf.api.user;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.common.ValidationException;

/** F-90: тема інтерфейсу в профілі — {@code PUT /api/me/theme {"theme": "light|dark|system"}}. */
@Tag(name = "auth")
@RestController
@RequestMapping("/api/me")
class ThemeController {

	record ThemeRequest(String theme) {
	}

	private final UserRepository users;

	private final Clock clock;

	ThemeController(UserRepository users, Clock clock) {
		this.users = users;
		this.clock = clock;
	}

	@Operation(summary = "Save the UI theme (light, dark or system) in the profile")
	@PutMapping("/theme")
	@Transactional
	ResponseEntity<Void> theme(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) ThemeRequest request) {
		var theme = Theme.parse(request == null ? null : request.theme())
			.orElseThrow(() -> new ValidationException(Map.of("theme", "INVALID")));
		var user = users.findById(principal.id()).orElseThrow();
		user.changeTheme(theme, clock.instant());
		return ResponseEntity.noContent().build();
	}

}
