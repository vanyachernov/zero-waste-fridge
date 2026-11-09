package ua.zwf.api.household;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.SessionExpiredException;

/** Домогосподарство поточного користувача — межа доступу до продуктів, списку покупок тощо. */
@Service
public class CurrentHousehold {

	private final MembershipRepository memberships;

	public CurrentHousehold(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	/** Без членства (акаунт видалено, поки жила сесія) — 401 {@code SESSION_EXPIRED}, як у {@code /auth/me}. */
	@Transactional(readOnly = true)
	public UUID idOf(UUID userId) {
		return memberships.findHouseholdIdByUserId(userId).orElseThrow(SessionExpiredException::new);
	}

}
