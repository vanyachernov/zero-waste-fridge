package ua.zwf.api.realtime;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.CurrentHousehold;

@Tag(name = "household")
@RestController
@RequestMapping("/api/household")
class RealtimeController {

	private final RealtimeHub hub;

	private final CurrentHousehold household;

	RealtimeController(RealtimeHub hub, CurrentHousehold household) {
		this.hub = hub;
		this.household = household;
	}

	record ShoppingRequest(String shoppingAt) {
	}

	@Operation(summary = "Server-Sent Events: changed {topic}, presence {online}, notifications")
	@GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	SseEmitter stream(@AuthenticationPrincipal AppUserPrincipal principal) {
		return hub.connect(household.idOf(principal.id()), principal.id(), principal.name());
	}

	@Operation(summary = "Who is online right now")
	@GetMapping("/presence")
	RealtimeHub.Presence presence(@AuthenticationPrincipal AppUserPrincipal principal) {
		return hub.presence(household.idOf(principal.id()));
	}

	@Operation(summary = "I am shopping at a store (null when not shopping)")
	@PostMapping("/presence")
	ResponseEntity<Void> shopping(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody(required = false) ShoppingRequest request) {
		String store = request == null || request.shoppingAt() == null ? null : request.shoppingAt().strip();
		if (store != null && store.length() > 60) {
			throw new ValidationException(Map.of("shoppingAt", "Size"));
		}
		hub.shopping(household.idOf(principal.id()), principal.id(), store == null || store.isEmpty() ? null : store);
		return ResponseEntity.noContent().build();
	}

}
