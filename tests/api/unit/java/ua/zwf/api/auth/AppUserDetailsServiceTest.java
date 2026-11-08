package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

class AppUserDetailsServiceTest {

	private final UserRepository users = mock(UserRepository.class);

	private final AppUserDetailsService service = new AppUserDetailsService(users);

	@Test
	void loadsByNormalizedEmail() {
		when(users.findByEmail("olena@example.com"))
			.thenReturn(Optional.of(new User("olena@example.com", "Олена", "{bcrypt}x", Instant.EPOCH)));

		var details = service.loadUserByUsername("  OLENA@example.com ");

		assertThat(details).isInstanceOf(AppUserPrincipal.class);
		assertThat(details.getUsername()).isEqualTo("olena@example.com");
		assertThat(details.getPassword()).isEqualTo("{bcrypt}x");
	}

	@Test
	void unknownEmailThrowsUsernameNotFound() {
		when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.loadUserByUsername("nobody@example.com"))
			.isInstanceOf(UsernameNotFoundException.class);
	}

}
