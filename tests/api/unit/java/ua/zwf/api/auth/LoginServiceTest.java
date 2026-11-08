package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class LoginServiceTest {

	private final AuthenticationManager manager = mock(AuthenticationManager.class);

	private final LoginService service = new LoginService(manager);

	@Test
	void authenticatesWithNormalizedEmail() {
		var principal = new AppUserPrincipal(UUID.randomUUID(), "olena@example.com", "Олена", null);
		var authenticated = UsernamePasswordAuthenticationToken.authenticated(principal, null,
				principal.getAuthorities());
		when(manager.authenticate(argThat(a -> "olena@example.com".equals(a.getPrincipal())
				&& "Secret-pass-123".equals(a.getCredentials()) && !a.isAuthenticated())))
			.thenReturn(authenticated);

		var result = service.authenticate(new LoginRequest(" OLENA@example.com", "Secret-pass-123", false));

		assertThat(result).isSameAs(authenticated);
	}

	@Test
	void anyAuthenticationFailureBecomesGenericInvalidCredentials() {
		when(manager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
		assertThatThrownBy(() -> service.authenticate(new LoginRequest("a@b.c", "x", false)))
			.isInstanceOfSatisfying(InvalidCredentialsException.class, ex -> {
				assertThat(ex.status()).isEqualTo(HttpStatus.UNAUTHORIZED);
				assertThat(ex.code()).isEqualTo("INVALID_CREDENTIALS");
			});

		doThrow(new DisabledException("disabled")).when(manager).authenticate(any());
		assertThatThrownBy(() -> service.authenticate(new LoginRequest("a@b.c", "x", false)))
			.isInstanceOf(InvalidCredentialsException.class);
	}

}
