package ua.zwf.api.auth;

import java.time.Clock;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.household.Household;
import ua.zwf.api.household.HouseholdNames;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.household.HouseholdRole;
import ua.zwf.api.household.Membership;
import ua.zwf.api.household.MembershipRepository;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

/** B-02: користувач + його домогосподарство, де він OWNER. */
@Service
public class RegistrationService {

	private final UserRepository users;

	private final HouseholdRepository households;

	private final MembershipRepository memberships;

	private final PasswordEncoder passwordEncoder;

	private final Clock clock;

	public RegistrationService(UserRepository users, HouseholdRepository households, MembershipRepository memberships,
			PasswordEncoder passwordEncoder, Clock clock) {
		this.users = users;
		this.households = households;
		this.memberships = memberships;
		this.passwordEncoder = passwordEncoder;
		this.clock = clock;
	}

	@Transactional
	public Membership register(RegisterRequest request) {
		PasswordPolicy.check(request.password());
		String email = Emails.normalize(request.email());
		String name = request.name().strip().replaceAll("\\s+", " ");
		if (users.existsByEmail(email)) {
			throw new EmailAlreadyUsedException();
		}

		var now = clock.instant();
		User user;
		try {
			user = users.saveAndFlush(new User(email, name, passwordEncoder.encode(request.password()), now));
		}
		catch (DataIntegrityViolationException ex) {
			// Паралельна реєстрація з тим самим email пройшла existsByEmail раніше за нас
			throw new EmailAlreadyUsedException();
		}
		var household = households.save(new Household(HouseholdNames.forOwner(name), now));
		return memberships.save(new Membership(household, user, HouseholdRole.OWNER, now));
	}

}
