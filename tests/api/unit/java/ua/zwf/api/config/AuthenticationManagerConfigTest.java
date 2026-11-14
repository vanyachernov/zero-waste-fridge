package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

/** Бін AuthenticationManager: BCrypt через DelegatingPasswordEncoder, без розкриття причини відмови. */
class AuthenticationManagerConfigTest {

	private final SecurityConfig config = new SecurityConfig();

	private final org.springframework.security.crypto.password.PasswordEncoder encoder = config.passwordEncoder();

	private final org.springframework.security.authentication.AuthenticationManager manager = config
		.authenticationManager(new InMemoryUserDetailsManager(User.withUsername("olena@example.com")
			.password(encoder.encode("Secret-pass-123"))
			.roles("USER")
			.build()), encoder);

	@Test
	void encoderProducesPrefixedBcrypt() {
		assertThat(encoder.encode("x")).startsWith("{bcrypt}$2");
	}

	@Test
	void authenticatesWithCorrectPassword() {
		var result = manager
			.authenticate(UsernamePasswordAuthenticationToken.unauthenticated("olena@example.com", "Secret-pass-123"));
		assertThat(result.isAuthenticated()).isTrue();
		assertThat(result.getCredentials()).as("credentials erased after authentication").isNull();
	}

	@Test
	void wrongPasswordAndUnknownUserLookTheSame() {
		assertThatThrownBy(() -> manager
			.authenticate(UsernamePasswordAuthenticationToken.unauthenticated("olena@example.com", "wrong")))
			.isExactlyInstanceOf(BadCredentialsException.class);
		assertThatThrownBy(() -> manager
			.authenticate(UsernamePasswordAuthenticationToken.unauthenticated("nobody@example.com", "wrong")))
			.isExactlyInstanceOf(BadCredentialsException.class);
	}

}
