package ua.zwf.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.household.Household;
import ua.zwf.api.household.HouseholdRole;
import ua.zwf.api.household.Membership;
import ua.zwf.api.household.MembershipRepository;
import ua.zwf.api.user.User;

class CurrentUserServiceTest {

	private final MembershipRepository memberships = mock(MembershipRepository.class);

	private final CurrentUserService service = new CurrentUserService(memberships);

	@Test
	void mapsMembershipToProfile() throws Exception {
		var userId = UUID.randomUUID();
		var householdId = UUID.randomUUID();
		var user = withId(new User("olena@example.com", "Олена Кравченко", "{bcrypt}x", Instant.EPOCH), userId);
		var household = withId(new Household("Сім'я Кравченко", Instant.EPOCH), householdId);
		when(memberships.findWithHouseholdByUserId(userId))
			.thenReturn(Optional.of(new Membership(household, user, HouseholdRole.MEMBER, Instant.EPOCH)));

		var profile = service.find(userId).orElseThrow();

		assertThat(profile).isEqualTo(new CurrentUserResponse(userId, "Олена Кравченко", "olena@example.com", null,
				householdId, "Сім'я Кравченко", HouseholdRole.MEMBER));
	}

	@Test
	void emptyWhenUserIsGone() {
		var userId = UUID.randomUUID();
		when(memberships.findWithHouseholdByUserId(userId)).thenReturn(Optional.empty());

		assertThat(service.find(userId)).isEmpty();
	}

	@Test
	void profileNeverExposesPasswordHash() {
		assertThat(CurrentUserResponse.class.getRecordComponents())
			.extracting(java.lang.reflect.RecordComponent::getName)
			.containsExactly("id", "name", "email", "avatarUrl", "householdId", "householdName", "role");
	}

	static <T> T withId(T entity, UUID id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
		return entity;
	}

}
