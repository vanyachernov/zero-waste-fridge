package ua.zwf.api.household;

import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.CurrentUserResponse;
import ua.zwf.api.auth.SessionExpiredException;
import ua.zwf.api.common.ValidationException;

/**
 * B-55: «Видалити холодильник і всі дані» — лише власник і лише з підтвердженням паролем.
 * Каскадом у БД зникають продукти, історія, список покупок, магазини, налаштування, запрошення й код.
 * Акаунти лишаються: кожен колишній учасник отримує власне порожнє домогосподарство і далі може
 * працювати або вступити в іншу сім'ю.
 */
@Service
public class HouseholdDeletion {

	public static final String INVALID_PASSWORD = "INVALID_PASSWORD";

	private final MembershipRepository memberships;

	private final HouseholdRepository households;

	private final PasswordEncoder passwordEncoder;

	private final EntityManager em;

	private final Clock clock;

	public HouseholdDeletion(MembershipRepository memberships, HouseholdRepository households,
			PasswordEncoder passwordEncoder, EntityManager em, Clock clock) {
		this.memberships = memberships;
		this.households = households;
		this.passwordEncoder = passwordEncoder;
		this.em = em;
		this.clock = clock;
	}

	@Transactional
	public CurrentUserResponse delete(UUID userId, String password) {
		var owner = memberships.findWithHouseholdByUserId(userId).orElseThrow(SessionExpiredException::new);
		if (password == null || password.isEmpty()) {
			throw new ValidationException(Map.of("password", "NotBlank"));
		}
		if (!passwordEncoder.matches(password, owner.getUser().getPasswordHash())) {
			throw new ValidationException(Map.of("password", INVALID_PASSWORD));
		}

		UUID doomed = owner.getHousehold().getId();
		var now = clock.instant();
		for (Membership member : memberships.findByHouseholdIdWithUser(doomed)) {
			var own = households.save(new Household(HouseholdNames.forOwner(member.getUser().getName()), now));
			member.moveTo(own, HouseholdRole.OWNER, now);
		}
		em.flush();
		em.createNativeQuery("delete from household where id = :id").setParameter("id", doomed).executeUpdate();
		em.clear();
		return memberships.findWithHouseholdByUserId(userId).map(CurrentUserResponse::of).orElseThrow();
	}

}
