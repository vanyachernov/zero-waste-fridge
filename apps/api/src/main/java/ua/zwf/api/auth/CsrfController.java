package ua.zwf.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "auth")
@RestController
@RequestMapping("/api/auth")
class CsrfController {

	/**
	 * Нічого не повертає: відповідь лише гарантує cookie {@code XSRF-TOKEN} (її ставить {@code CsrfCookieFilter}).
	 * SPA викликає цей ендпоінт, якщо перед POST/PUT/PATCH/DELETE cookie ще немає.
	 */
	@Operation(summary = "Issue XSRF-TOKEN cookie")
	@GetMapping("/csrf")
	ResponseEntity<Void> csrf() {
		return ResponseEntity.noContent().build();
	}

}
