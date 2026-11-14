package ua.zwf.api.auth.reset;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "auth")
@RestController
@RequestMapping("/api/auth/password")
class PasswordResetController {

	private final PasswordResetService service;

	PasswordResetController(PasswordResetService service) {
		this.service = service;
	}

	/** Завжди 202 — однаково для зареєстрованих і невідомих email. */
	@Operation(summary = "Send a password reset link by email")
	@PostMapping("/forgot")
	ResponseEntity<Void> forgot(@Valid @RequestBody ForgotPasswordRequest body) {
		service.requestReset(body.email());
		return ResponseEntity.accepted().build();
	}

	@Operation(summary = "Set a new password using the token from the email; signs out all sessions")
	@PostMapping("/reset")
	ResponseEntity<Void> reset(@Valid @RequestBody ResetPasswordRequest body) {
		service.resetPassword(body.token(), body.password());
		return ResponseEntity.noContent().build();
	}

	record ForgotPasswordRequest(@NotBlank @Email String email) {

		ForgotPasswordRequest {
			email = email == null ? null : email.strip();
		}

	}

	record ResetPasswordRequest(@NotBlank String token, String password) {

		@Override
		public String toString() {
			return "ResetPasswordRequest[token=***, password=***]";
		}

	}

}
