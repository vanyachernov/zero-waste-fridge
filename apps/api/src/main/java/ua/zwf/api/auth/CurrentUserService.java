package ua.zwf.api.auth;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.household.MembershipRepository;

@Service
public class CurrentUserService {

	private final MembershipRepository memberships;

	public CurrentUserService(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	@Transactional(readOnly = true)
	public CurrentUserResponse get(UUID userId) {
		return memberships.findWithHouseholdByUserId(userId)
			.map(CurrentUserResponse::of)
			.orElseThrow(() -> new IllegalStateException("User " + userId + " has no household"));
	}

}
