package ua.zwf.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Пароль перевіряє {@link PasswordPolicy} (ті самі правила, що й для скидання пароля). */
public record RegisterRequest(@NotBlank @Size(max = 80) String name, @NotBlank @Email @Size(max = 254) String email,
		String password) {

	/** Пробіли по краях email (часто з'являються при вставці) не повинні валити перевірку {@code @Email}. */
	public RegisterRequest {
		email = email == null ? null : email.strip();
	}

	@Override
	public String toString() {
		return "RegisterRequest[name=" + name + ", email=" + email + ", password=***]";
	}

}
