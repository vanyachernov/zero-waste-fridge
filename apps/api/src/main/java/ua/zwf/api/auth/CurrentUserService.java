package ua.zwf.api.auth;

import java.util.Optional;
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

	/** Свіжі дані з БД (ім'я, роль, домогосподарство могли змінитися після входу). */
	@Transactional(readOnly = true)
	public Optional<CurrentUserResponse> find(UUID userId) {
		return memberships.findWithHouseholdByUserId(userId).map(CurrentUserResponse::of);
	}

}
