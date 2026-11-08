package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import ua.zwf.api.household.Household;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.household.HouseholdRole;
import ua.zwf.api.household.Membership;
import ua.zwf.api.household.MembershipRepository;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {

	static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");

	@Mock
	UserRepository users;

	@Mock
	HouseholdRepository households;

	@Mock
	MembershipRepository memberships;

	@Mock
	PasswordEncoder passwordEncoder;

	RegistrationService service;

	@BeforeEach
	void setUp() {
		service = new RegistrationService(users, households, memberships, passwordEncoder,
				Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void createsUserHouseholdAndOwnerMembership() {
		when(users.existsByEmail("olena@example.com")).thenReturn(false);
		when(passwordEncoder.encode("Secret-pass-123")).thenReturn("{bcrypt}hash");
		when(users.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
		when(households.save(any(Household.class))).thenAnswer(inv -> inv.getArgument(0));
		when(memberships.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

		var membership = service.register(new RegisterRequest("  Олена   Кравченко ", " Olena@Example.com ",
				"Secret-pass-123"));

		var user = membership.getUser();
		assertThat(user.getEmail()).isEqualTo("olena@example.com");
		assertThat(user.getName()).isEqualTo("Олена Кравченко");
		assertThat(user.getPasswordHash()).isEqualTo("{bcrypt}hash");
		assertThat(user.getCreatedAt()).isEqualTo(NOW);
		assertThat(membership.getRole()).isEqualTo(HouseholdRole.OWNER);
		assertThat(membership.getHousehold().getName()).isEqualTo("Сім'я Кравченко");
		assertThat(membership.getJoinedAt()).isEqualTo(NOW);
	}

	@Test
	void rejectsExistingEmailBeforeHashing() {
		when(users.existsByEmail("olena@example.com")).thenReturn(true);

		assertThatThrownBy(() -> service.register(new RegisterRequest("Олена", "OLENA@example.com", "Secret-pass-123")))
			.isInstanceOf(EmailAlreadyUsedException.class);

		verify(passwordEncoder, never()).encode(any());
		verifyNoInteractions(households, memberships);
	}

	@Test
	void mapsUniqueViolationFromConcurrentRegistrationToConflict() {
		when(users.existsByEmail("olena@example.com")).thenReturn(false);
		when(passwordEncoder.encode(any())).thenReturn("{bcrypt}hash");
		when(users.saveAndFlush(any(User.class))).thenThrow(new DataIntegrityViolationException("app_user_email_uk"));

		assertThatThrownBy(() -> service.register(new RegisterRequest("Олена", "olena@example.com", "Secret-pass-123")))
			.isInstanceOf(EmailAlreadyUsedException.class);
		verifyNoInteractions(households, memberships);
	}

	@Test
	void enforcesPasswordPolicyBeforeTouchingDatabase() {
		assertThatThrownBy(() -> service.register(new RegisterRequest("Олена", "olena@example.com", "short")))
			.isInstanceOf(PasswordPolicy.Violation.class);
		verifyNoInteractions(users, households, memberships, passwordEncoder);
	}

}
