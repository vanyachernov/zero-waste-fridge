package ua.zwf.api.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import ua.zwf.api.household.HouseholdPermission;
import ua.zwf.api.household.Membership;
import ua.zwf.api.household.MembershipRepository;

/** Хто з сім'ї отримує нагадування: право з матриці ролей (далі — і налаштування користувача, B-34). */
@Component
public class ReminderRecipients {

	private final MembershipRepository memberships;

	public ReminderRecipients(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	public List<Membership> of(UUID householdId) {
		return memberships.findByHouseholdIdWithUser(householdId)
			.stream()
			.filter(m -> m.getRole().can(HouseholdPermission.RECEIVE_REMINDERS))
			.toList();
	}

}
