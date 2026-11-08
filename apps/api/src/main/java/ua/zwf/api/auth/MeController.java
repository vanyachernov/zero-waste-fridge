package ua.zwf.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "auth")
@RestController
@RequestMapping("/api/auth")
class MeController {

	private final CurrentUserService currentUser;

	MeController(CurrentUserService currentUser) {
		this.currentUser = currentUser;
	}

	/** B-05. Без сесії → 401 (повертає Spring Security ще до контролера). */
	@Operation(summary = "Current user profile with household and role")
	@GetMapping("/me")
	CurrentUserResponse me(@AuthenticationPrincipal AppUserPrincipal principal, HttpServletRequest request) {
		return currentUser.find(principal.id()).orElseThrow(() -> {
			var session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
			SecurityContextHolder.clearContext();
			return new SessionExpiredException();
		});
	}

}
