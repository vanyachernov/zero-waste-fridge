package ua.zwf.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Пароль перевіряє {@link PasswordPolicy} (ті самі правила, що й для скидання пароля).
 *
 * @param rememberMe за замовчуванням {@code true} — щойно зареєстрований користувач лишається в системі
 */
public record RegisterRequest(@NotBlank @Size(max = 80) String name, @NotBlank @Email @Size(max = 254) String email,
		String password, Boolean rememberMe) {

	/** Пробіли по краях email (часто з'являються при вставці) не повинні валити перевірку {@code @Email}. */
	public RegisterRequest {
		email = email == null ? null : email.strip();
		rememberMe = rememberMe == null || rememberMe;
	}

	public RegisterRequest(String name, String email, String password) {
		this(name, email, password, true);
	}

	@Override
	public String toString() {
		return "RegisterRequest[name=" + name + ", email=" + email + ", password=***, rememberMe=" + rememberMe + "]";
	}

}
