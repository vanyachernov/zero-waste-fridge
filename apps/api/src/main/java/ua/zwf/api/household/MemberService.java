package ua.zwf.api.household;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.activity.ActivityService;
import ua.zwf.api.common.ValidationException;

/**
 * B-51: учасники сім'ї.
 * <ul>
 *   <li>Список бачать усі учасники; власники — першими.</li>
 *   <li>Роль змінює лише власник; останнього власника понизити не можна.</li>
 *   <li>Видаляє власник; кожен може вийти сам. Хто вийшов або кого видалили, отримує власне порожнє
 *       домогосподарство — інваріант «користувач завжди в одному домогосподарстві».</li>
 * </ul>
 */
@Service
public class MemberService {

	private final MembershipRepository memberships;

	private final HouseholdRepository households;

	private final CurrentHousehold current;

	private final ActivityService activity;

	private final Clock clock;

	public MemberService(MembershipRepository memberships, HouseholdRepository households, CurrentHousehold current,
			ActivityService activity, Clock clock) {
		this.memberships = memberships;
		this.households = households;
		this.current = current;
		this.activity = activity;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<MemberResponse> list(UUID userId) {
		UUID householdId = current.idOf(userId);
		return memberships.findByHouseholdIdWithUser(householdId)
			.stream()
			.sorted(Comparator.comparing((Membership m) -> m.getRole() == HouseholdRole.OWNER ? 0 : 1)
				.thenComparing(Membership::getJoinedAt))
			.map(m -> response(m, householdId, userId))
			.toList();
	}

	@Transactional
	public MemberResponse changeRole(UUID userId, UUID memberId, HouseholdRole role) {
		if (role == null) {
			throw new ValidationException(Map.of("role", "NotNull"));
		}
		UUID householdId = current.idOf(userId);
		var member = find(householdId, memberId);
		if (member.getRole() == HouseholdRole.OWNER && role != HouseholdRole.OWNER) {
			requireAnotherOwner(householdId);
		}
		member.changeRole(role);
		return response(member, householdId, userId);
	}

	@Transactional
	public void remove(UUID userId, UUID memberId) {
		UUID householdId = current.idOf(userId);
		var actorRole = memberships.findRoleByUserId(userId).orElseThrow();
		boolean leaving = userId.equals(memberId);
		if (!leaving && !actorRole.can(HouseholdPermission.MANAGE_MEMBERS)) {
			throw new AccessDeniedException("Only owners remove members");
		}
		var member = find(householdId, memberId);
		if (member.getRole() == HouseholdRole.OWNER) {
			// Останній власник не може піти: інакше сім'я лишиться без керування (або видаліть її, B-55)
			requireAnotherOwner(householdId);
		}
		var now = clock.instant();
		var own = households.save(new Household(HouseholdNames.forOwner(member.getUser().getName()), now));
		member.moveTo(own, HouseholdRole.OWNER, now);
	}

	private void requireAnotherOwner(UUID householdId) {
		if (memberships.countByHouseholdIdAndRole(householdId, HouseholdRole.OWNER) <= 1) {
			throw new LastOwnerException();
		}
	}

	private Membership find(UUID householdId, UUID memberId) {
		return memberships.findInHousehold(householdId, memberId).orElseThrow(MemberNotFoundException::new);
	}

	private MemberResponse response(Membership m, UUID householdId, UUID me) {
		var user = m.getUser();
		return new MemberResponse(user.getId(), user.getName(), user.getEmail(), user.getAvatarUrl(), m.getRole(),
				m.getJoinedAt(), user.getId().equals(me), activity.latestOf(householdId, user.getId()).orElse(null));
	}

}
