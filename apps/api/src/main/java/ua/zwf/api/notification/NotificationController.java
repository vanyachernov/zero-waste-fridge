package ua.zwf.api.notification;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;

@Tag(name = "notifications")
@RestController
@RequestMapping("/api/notifications")
class NotificationController {

	private final NotificationService notifications;

	NotificationController(NotificationService notifications) {
		this.notifications = notifications;
	}

	record UnreadCount(long count) {
	}

	record Updated(int updated) {
	}

	@Operation(summary = "Notifications: unread first, newest first, with the unread count")
	@GetMapping
	NotificationService.Feed feed(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(defaultValue = "" + NotificationService.DEFAULT_LIMIT) int limit) {
		return notifications.feed(principal.id(), limit);
	}

	@Operation(summary = "Unread count for the bell badge")
	@GetMapping("/unread-count")
	UnreadCount unread(@AuthenticationPrincipal AppUserPrincipal principal) {
		return new UnreadCount(notifications.unread(principal.id()));
	}

	@Operation(summary = "Mark one notification as read")
	@PostMapping("/{id}/read")
	ResponseEntity<Void> read(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		notifications.markRead(principal.id(), id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Mark all notifications as read")
	@PostMapping("/read-all")
	Updated readAll(@AuthenticationPrincipal AppUserPrincipal principal) {
		return new Updated(notifications.markAllRead(principal.id()));
	}

}
