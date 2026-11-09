package ua.zwf.api.household;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.auth.SessionExpiredException;
import ua.zwf.api.common.ValidationException;

@Service
public class HouseholdService {

	public static final int NAME_MAX = 120;

	private final MembershipRepository memberships;

	public HouseholdService(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	@Transactional(readOnly = true)
	public HouseholdResponse get(UUID userId) {
		return response(membership(userId));
	}

	@Transactional
	public HouseholdResponse rename(UUID userId, String rawName) {
		String name = rawName == null ? null : rawName.strip().replaceAll("\\s+", " ");
		if (name == null) {
			throw new ValidationException(Map.of("name", "NotNull"));
		}
		if (name.isEmpty()) {
			throw new ValidationException(Map.of("name", "NotBlank"));
		}
		if (name.length() > NAME_MAX) {
			throw new ValidationException(Map.of("name", "Size"));
		}
		var membership = membership(userId);
		membership.getHousehold().rename(name);
		return response(membership);
	}

	private Membership membership(UUID userId) {
		return memberships.findWithHouseholdByUserId(userId).orElseThrow(SessionExpiredException::new);
	}

	private HouseholdResponse response(Membership m) {
		var household = m.getHousehold();
		return new HouseholdResponse(household.getId(), household.getName(), household.getCreatedAt(),
				memberships.countByHouseholdId(household.getId()), m.getRole(), List.copyOf(m.getRole().permissions()));
	}

}
