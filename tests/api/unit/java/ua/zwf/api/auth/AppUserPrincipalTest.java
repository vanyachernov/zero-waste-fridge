package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import ua.zwf.api.user.User;

class AppUserPrincipalTest {

	@Test
	void usesEmailAsUsernameAndHasUserRole() {
		var principal = AppUserPrincipal.of(new User("olena@example.com", "Олена", "{bcrypt}x", Instant.EPOCH));

		assertThat(principal.getUsername()).isEqualTo("olena@example.com");
		assertThat(principal.getPassword()).isEqualTo("{bcrypt}x");
		assertThat(principal.name()).isEqualTo("Олена");
		assertThat(principal.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_USER");
		assertThat(principal.isEnabled()).isTrue();
	}

	@Test
	void eraseCredentialsDropsHash() {
		var principal = new AppUserPrincipal(UUID.randomUUID(), "a@b.c", "A", "{bcrypt}x");
		principal.eraseCredentials();
		assertThat(principal.getPassword()).isNull();
	}

	@Test
	void isJavaSerializableForSpringSessionJdbc() throws Exception {
		var id = UUID.randomUUID();
		var principal = new AppUserPrincipal(id, "a@b.c", "Олена", null);

		var bytes = new ByteArrayOutputStream();
		try (var out = new ObjectOutputStream(bytes)) {
			out.writeObject(principal);
		}
		try (var in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
			var copy = (AppUserPrincipal) in.readObject();
			assertThat(copy.id()).isEqualTo(id);
			assertThat(copy.getUsername()).isEqualTo("a@b.c");
			assertThat(copy.name()).isEqualTo("Олена");
		}
	}

}
