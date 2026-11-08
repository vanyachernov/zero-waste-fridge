package ua.zwf.api.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import ua.zwf.api.user.User;

class PasswordResetTokenTest {

	static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");

	private final PasswordResetToken token = new PasswordResetToken(
			new User("a@b.c", "A", "{bcrypt}x", NOW), "hash", NOW, NOW.plus(Duration.ofHours(1)));

	@Test
	void usableUntilExpiry() {
		assertThat(token.isUsable(NOW)).isTrue();
		assertThat(token.isUsable(NOW.plus(Duration.ofMinutes(59)))).isTrue();
		assertThat(token.isUsable(NOW.plus(Duration.ofHours(1)))).isFalse();
	}

	@Test
	void notUsableOnceUsed() {
		token.markUsed(NOW);
		assertThat(token.isUsable(NOW)).isFalse();
		assertThat(token.getUsedAt()).isEqualTo(NOW);
	}

}
