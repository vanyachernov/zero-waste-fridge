package ua.zwf.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** @param rememberMe «Запам'ятати мене»: сесія 30 днів і постійна cookie; інакше — до закриття браузера (12 год) */
public record LoginRequest(@NotBlank @Email String email, @NotBlank String password, boolean rememberMe) {

	public LoginRequest {
		email = email == null ? null : email.strip();
	}

	@Override
	public String toString() {
		return "LoginRequest[email=" + email + ", password=***, rememberMe=" + rememberMe + "]";
	}

}
