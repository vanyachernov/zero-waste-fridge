package ua.zwf.api.household;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.CurrentUserResponse;
import ua.zwf.api.auth.SessionExpiredException;
import ua.zwf.api.auth.reset.ResetTokens;
import ua.zwf.api.common.ValidationException;

/**
 * B-52: {@code POST /api/household/join} — вступ за кодом сім'ї (роль MEMBER) або за посиланням із листа
 * (роль із запрошення, лише для того email, на який його надіслано).
 */
@Service
public class JoinService {

	public record JoinRequest(String code, String invite) {
	}

	private record Target(UUID householdId, HouseholdRole role, HouseholdInvite invite) {
	}

	private final MembershipRepository memberships;

	private final HouseholdRepository households;

	private final HouseholdInviteRepository invites;

	private final HouseholdJoinCodeRepository codes;

	private final HouseholdMerge merge;

	private final Clock clock;

	public JoinService(MembershipRepository memberships, HouseholdRepository households,
			HouseholdInviteRepository invites, HouseholdJoinCodeRepository codes, HouseholdMerge merge, Clock clock) {
		this.memberships = memberships;
		this.households = households;
		this.invites = invites;
		this.codes = codes;
		this.merge = merge;
		this.clock = clock;
	}

	@Transactional
	public CurrentUserResponse join(UUID userId, JoinRequest request) {
		var membership = memberships.findWithHouseholdByUserId(userId).orElseThrow(SessionExpiredException::new);
		var target = resolve(request, membership.getUser().getEmail());
		UUID from = membership.getHousehold().getId();
		if (from.equals(target.householdId())) {
			throw new AlreadyMemberException();
		}
		boolean alone = memberships.countByHouseholdId(from) == 1;
		if (!alone && membership.getRole() == HouseholdRole.OWNER
				&& memberships.countByHouseholdIdAndRole(from, HouseholdRole.OWNER) == 1) {
			// Сім'я без власника лишилася б без керування: спершу призначте іншого власника
			throw new LastOwnerException();
		}

		var now = clock.instant();
		membership.moveTo(households.getReferenceById(target.householdId()), target.role(), now);
		if (target.invite() != null) {
			target.invite().accept(membership.getUser(), now);
		}
		if (alone) {
			merge.moveDataAndDelete(from, target.householdId());
		}
		memberships.flush();
		return memberships.findWithHouseholdByUserId(userId).map(CurrentUserResponse::of).orElseThrow();
	}

	private Target resolve(JoinRequest request, String userEmail) {
		boolean hasCode = request != null && request.code() != null && !request.code().isBlank();
		boolean hasInvite = request != null && request.invite() != null && !request.invite().isBlank();
		if (hasCode == hasInvite) {
			throw new ValidationException(Map.of(hasCode ? "invite" : "code", hasCode ? "EXCLUSIVE" : "NotBlank"));
		}
		var now = clock.instant();
		if (hasCode) {
			return JoinCodes.normalize(request.code())
				.flatMap(codes::findByCode)
				.filter(c -> c.isValid(now))
				.map(c -> new Target(c.getHouseholdId(), HouseholdRole.MEMBER, null))
				.orElseThrow(InvalidInviteException::new);
		}
		var invite = invites.findByTokenHash(ResetTokens.hash(request.invite().strip()))
			.filter(i -> i.isOpen(now))
			.orElseThrow(InvalidInviteException::new);
		if (!invite.getEmail().equals(userEmail)) {
			throw new InviteEmailMismatchException();
		}
		return new Target(invite.getHousehold().getId(), invite.getRole(), invite);
	}

}
