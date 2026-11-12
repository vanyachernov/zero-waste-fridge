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

	private final NotificationSettingsService settings;

	public ReminderRecipients(MembershipRepository memberships, NotificationSettingsService settings) {
		this.memberships = memberships;
		this.settings = settings;
	}

	/** Учасники з правом на нагадування, у яких увімкнено дзвіночок або push (B-34). */
	public List<Membership> of(UUID householdId) {
		var members = memberships.findByHouseholdIdWithUser(householdId)
			.stream()
			.filter(m -> m.getRole().can(HouseholdPermission.RECEIVE_REMINDERS))
			.toList();
		var byUser = settings.of(members.stream().map(m -> m.getUser().getId()).toList());
		return members.stream().filter(m -> byUser.get(m.getUser().getId()).wantsReminders()).toList();
	}

}
