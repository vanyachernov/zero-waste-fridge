package ua.zwf.api.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import ua.zwf.api.auth.PasswordPolicy;
import ua.zwf.api.config.ZwfProperties;
import ua.zwf.api.mail.Mailer;
import ua.zwf.api.mail.OutgoingMail;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

class PasswordResetServiceTest {

	static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");

	final UserRepository users = mock(UserRepository.class);

	final PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);

	final PasswordEncoder encoder = mock(PasswordEncoder.class);

	final Mailer mailer = mock(Mailer.class);

	@SuppressWarnings("unchecked")
	final FindByIndexNameSessionRepository<Session> sessions = mock(FindByIndexNameSessionRepository.class);

	final ZwfProperties properties = new ZwfProperties("https://zwf.app/",
			new ZwfProperties.Mail(null, false), new ZwfProperties.Auth(Duration.ofHours(1), Duration.ofMinutes(1)));

	PasswordResetService service;

	User user;

	@BeforeEach
	void setUp() throws Exception {
		service = new PasswordResetService(users, tokens, encoder, mailer, sessions, properties,
				Clock.fixed(NOW, ZoneOffset.UTC));
		user = new User("olena@example.com", "Олена", "{bcrypt}old", Instant.EPOCH);
		Field id = User.class.getDeclaredField("id");
		id.setAccessible(true);
		id.set(user, UUID.randomUUID());
	}

	@Test
	void unknownEmailDoesNothing() {
		when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

		service.requestReset(" Nobody@Example.com ");

		verifyNoInteractions(tokens, mailer);
	}

	@Test
	void issuesHashedTokenInvalidatesOldOnesAndMailsLink() {
		when(users.findByEmail("olena@example.com")).thenReturn(Optional.of(user));

		service.requestReset("OLENA@example.com");

		verify(tokens).invalidateAllForUser(user.getId(), NOW);
		var saved = ArgumentCaptor.forClass(PasswordResetToken.class);
		verify(tokens).save(saved.capture());
		var mail = ArgumentCaptor.forClass(OutgoingMail.class);
		verify(mailer).send(mail.capture());

		var token = mail.getValue().text().replaceAll("(?s).*token=([A-Za-z0-9_-]{43}).*", "$1");
		assertThat(mail.getValue().to()).isEqualTo("olena@example.com");
		assertThat(mail.getValue().text()).contains("https://zwf.app/lms/reset-password?token=" + token);
		assertThat(saved.getValue().getTokenHash()).isEqualTo(ResetTokens.hash(token));
		assertThat(saved.getValue().getExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(1)));
		assertThat(saved.getValue().getUser()).isSameAs(user);
	}

	@Test
	void throttlesWithinCooldown() {
		when(users.findByEmail("olena@example.com")).thenReturn(Optional.of(user));
		when(tokens.existsByUserIdAndCreatedAtAfter(user.getId(), NOW.minus(Duration.ofMinutes(1)))).thenReturn(true);

		service.requestReset("olena@example.com");

		verify(tokens, never()).save(any());
		verify(tokens, never()).invalidateAllForUser(any(), any());
		verifyNoInteractions(mailer);
	}

	@Test
	void mailFailureIsSwallowedSoResponseStaysUniform() {
		when(users.findByEmail("olena@example.com")).thenReturn(Optional.of(user));
		doThrow(new MailSendException("smtp down")).when(mailer).send(any());

		service.requestReset("olena@example.com");

		verify(tokens).save(any());
	}

	@Test
	void resetChangesPasswordConsumesTokenAndKillsSessions() {
		var token = new PasswordResetToken(user, "h", NOW.minusSeconds(60), NOW.plusSeconds(3000));
		when(tokens.findByTokenHash(ResetTokens.hash("raw-token"))).thenReturn(Optional.of(token));
		when(encoder.encode("Brand-new-pass-456")).thenReturn("{bcrypt}new");
		when(sessions.findByPrincipalName("olena@example.com"))
			.thenReturn(Map.of("s1", mock(Session.class), "s2", mock(Session.class)));

		service.resetPassword(" raw-token ", "Brand-new-pass-456");

		assertThat(user.getPasswordHash()).isEqualTo("{bcrypt}new");
		assertThat(user.getUpdatedAt()).isEqualTo(NOW);
		assertThat(token.getUsedAt()).isEqualTo(NOW);
		verify(tokens).invalidateAllForUser(user.getId(), NOW);
		verify(sessions).deleteById("s1");
		verify(sessions).deleteById("s2");
	}

	@Test
	void rejectsUnknownExpiredOrUsedTokens() {
		when(tokens.findByTokenHash(anyString())).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.resetPassword("nope", "Brand-new-pass-456"))
			.isInstanceOf(InvalidResetTokenException.class);
		assertThatThrownBy(() -> service.resetPassword(" ", "Brand-new-pass-456"))
			.isInstanceOf(InvalidResetTokenException.class);

		var expired = new PasswordResetToken(user, "h", NOW.minusSeconds(7200), NOW.minusSeconds(1));
		when(tokens.findByTokenHash(ResetTokens.hash("expired"))).thenReturn(Optional.of(expired));
		assertThatThrownBy(() -> service.resetPassword("expired", "Brand-new-pass-456"))
			.isInstanceOf(InvalidResetTokenException.class);

		var used = new PasswordResetToken(user, "h", NOW.minusSeconds(60), NOW.plusSeconds(60));
		used.markUsed(NOW.minusSeconds(10));
		when(tokens.findByTokenHash(ResetTokens.hash("used"))).thenReturn(Optional.of(used));
		assertThatThrownBy(() -> service.resetPassword("used", "Brand-new-pass-456"))
			.isInstanceOf(InvalidResetTokenException.class);

		assertThat(user.getPasswordHash()).isEqualTo("{bcrypt}old");
		verifyNoInteractions(encoder, sessions);
	}

	@Test
	void weakPasswordFailsBeforeLookingUpToken() {
		assertThatThrownBy(() -> service.resetPassword("raw-token", "short"))
			.isInstanceOf(PasswordPolicy.Violation.class);
		verifyNoInteractions(tokens, encoder, sessions);
	}

}
