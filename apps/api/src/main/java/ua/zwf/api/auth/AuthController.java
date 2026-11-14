package ua.zwf.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "auth")
@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final RegistrationService registration;

	private final LoginService loginService;

	private final CurrentUserService currentUser;

	private final SessionAuthenticator sessionAuthenticator;

	AuthController(RegistrationService registration, LoginService loginService, CurrentUserService currentUser,
			SessionAuthenticator sessionAuthenticator) {
		this.registration = registration;
		this.loginService = loginService;
		this.currentUser = currentUser;
		this.sessionAuthenticator = sessionAuthenticator;
	}

	@Operation(summary = "Register and sign in (creates the user's household, role OWNER)")
	@PostMapping("/register")
	ResponseEntity<CurrentUserResponse> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request,
			HttpServletResponse response) {
		var membership = registration.register(body);
		var principal = AppUserPrincipal.of(membership.getUser());
		principal.eraseCredentials();
		var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null,
				principal.getAuthorities());
		sessionAuthenticator.signIn(authentication, body.rememberMe(), request, response);
		return ResponseEntity.status(HttpStatus.CREATED).body(CurrentUserResponse.of(membership));
	}

	/** B-03. Вихід — {@code POST /api/auth/logout}, його обробляє Spring Security (див. SecurityConfig). */
	@Operation(summary = "Sign in with email and password")
	@PostMapping("/login")
	CurrentUserResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
			HttpServletResponse response) {
		var authentication = loginService.authenticate(body);
		sessionAuthenticator.signIn(authentication, body.rememberMe(), request, response);
		var principal = (AppUserPrincipal) authentication.getPrincipal();
		return currentUser.find(principal.id()).orElseThrow(SessionExpiredException::new);
	}

}
