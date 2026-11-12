package ua.zwf.api.push;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;

@Tag(name = "notifications")
@RestController
@RequestMapping("/api/me")
class PushController {

	private final PushService push;

	PushController(PushService push) {
		this.push = push;
	}

	record Unsubscribe(String endpoint) {
	}

	@Operation(summary = "VAPID public key for PushManager.subscribe (null when push is disabled on the server)")
	@GetMapping("/push/public-key")
	PushService.PublicKey publicKey() {
		return push.publicKey();
	}

	@Operation(summary = "Save this browser's push subscription")
	@PostMapping("/push-subscriptions")
	ResponseEntity<Void> subscribe(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) PushService.SubscriptionRequest request) {
		push.subscribe(principal.id(), request);
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@Operation(summary = "Remove this browser's push subscription")
	@DeleteMapping("/push-subscriptions")
	ResponseEntity<Void> unsubscribe(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) Unsubscribe request) {
		push.unsubscribe(principal.id(), request == null ? null : request.endpoint());
		return ResponseEntity.noContent().build();
	}

}
