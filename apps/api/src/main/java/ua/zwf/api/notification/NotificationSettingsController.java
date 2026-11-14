package ua.zwf.api.notification;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;

@Tag(name = "notifications")
@RestController
@RequestMapping("/api/me/notification-settings")
class NotificationSettingsController {

	private final NotificationSettingsService settings;

	NotificationSettingsController(NotificationSettingsService settings) {
		this.settings = settings;
	}

	@Operation(summary = "My notification channels, digest hour and quiet hours")
	@GetMapping
	NotificationSettingsService.SettingsResponse get(@AuthenticationPrincipal AppUserPrincipal principal) {
		return settings.get(principal.id());
	}

	@Operation(summary = "Save my notification settings")
	@PutMapping
	NotificationSettingsService.SettingsResponse put(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) NotificationSettingsService.SettingsRequest request) {
		return settings.put(principal.id(), request);
	}

}
