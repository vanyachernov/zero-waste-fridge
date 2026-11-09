package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.auth.SessionExpiredException;

class CurrentHouseholdTest {

	private final MembershipRepository memberships = mock(MembershipRepository.class);

	private final CurrentHousehold current = new CurrentHousehold(memberships);

	@Test
	void returnsHouseholdOfUser() {
		var user = UUID.randomUUID();
		var household = UUID.randomUUID();
		when(memberships.findHouseholdIdByUserId(user)).thenReturn(Optional.of(household));

		assertThat(current.idOf(user)).isEqualTo(household);
	}

	@Test
	void missingMembershipMeansSessionExpired() {
		var user = UUID.randomUUID();
		when(memberships.findHouseholdIdByUserId(user)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> current.idOf(user)).isInstanceOf(SessionExpiredException.class);
	}

}
