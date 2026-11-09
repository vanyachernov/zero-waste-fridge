package ua.zwf.api.household;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import ua.zwf.api.auth.Emails;
import ua.zwf.api.auth.SessionExpiredException;
import ua.zwf.api.auth.reset.ResetTokens;
import ua.zwf.api.common.Today;
import ua.zwf.api.config.ZwfProperties;
import ua.zwf.api.mail.MailTemplates;
import ua.zwf.api.mail.Mailer;
import ua.zwf.api.user.UserRepository;

/** B-52: запрошення листом і код сім'ї. Обидва діють {@link #TTL}. */
@Service
public class InviteService {

	private static final Logger log = LoggerFactory.getLogger(InviteService.class);

	public static final Duration TTL = Duration.ofDays(7);

	public record InviteResponse(UUID id, String email, HouseholdRole role, String invitedBy, Instant createdAt,
			Instant expiresAt, boolean emailSent) {

		static InviteResponse of(HouseholdInvite i, boolean emailSent) {
			return new InviteResponse(i.getId(), i.getEmail(), i.getRole(),
					i.getInvitedBy() == null ? null : i.getInvitedBy().getName(), i.getCreatedAt(), i.getExpiresAt(),
					emailSent);
		}

	}

	/** {@code code = null} — коду ще немає або він прострочений: його треба згенерувати. */
	public record CodeResponse(String code, Instant expiresAt) {
	}

	private final HouseholdInviteRepository invites;

	private final HouseholdJoinCodeRepository codes;

	private final MembershipRepository memberships;

	private final UserRepository users;

	private final Mailer mailer;

	private final MailTemplates templates;

	private final ZwfProperties properties;

	private final Today today;

	private final Clock clock;

	public InviteService(HouseholdInviteRepository invites, HouseholdJoinCodeRepository codes,
			MembershipRepository memberships, UserRepository users, Mailer mailer, MailTemplates templates,
			ZwfProperties properties, Today today, Clock clock) {
		this.invites = invites;
		this.codes = codes;
		this.memberships = memberships;
		this.users = users;
		this.mailer = mailer;
		this.templates = templates;
		this.properties = properties;
		this.today = today;
		this.clock = clock;
	}

	@Transactional
	public InviteResponse invite(UUID userId, String rawEmail, HouseholdRole role) {
		var inviter = memberships.findWithHouseholdByUserId(userId).orElseThrow(SessionExpiredException::new);
		var household = inviter.getHousehold();
		String email = Emails.normalize(rawEmail);
		var now = clock.instant();

		boolean alreadyMember = users.findByEmail(email)
			.flatMap(u -> memberships.findInHousehold(household.getId(), u.getId()))
			.isPresent();
		if (alreadyMember) {
			throw new AlreadyMemberException();
		}
		var open = invites.findOpen(household.getId(), email);
		if (open.isPresent()) {
			if (open.get().isOpen(now)) {
				throw new InviteExistsException();
			}
			invites.deleteNow(open.get().getId());
		}

		String token = ResetTokens.generate();
		var invite = invites.save(new HouseholdInvite(household, email, role == null ? HouseholdRole.MEMBER : role,
				inviter.getUser(), ResetTokens.hash(token), now, now.plus(TTL)));
		return InviteResponse.of(invite, send(invite, inviter, token));
	}

	@Transactional(readOnly = true)
	public List<InviteResponse> pending(UUID householdId) {
		return invites.findPending(householdId, clock.instant()).stream().map(i -> InviteResponse.of(i, true)).toList();
	}

	@Transactional
	public void cancel(UUID householdId, UUID inviteId) {
		var invite = invites.findByIdAndHouseholdId(inviteId, householdId).orElseThrow(InviteNotFoundException::new);
		invites.delete(invite);
	}

	@Transactional(readOnly = true)
	public CodeResponse code(UUID householdId) {
		return codes.findById(householdId)
			.filter(c -> c.isValid(clock.instant()))
			.map(c -> new CodeResponse(c.getCode(), c.getExpiresAt()))
			.orElse(new CodeResponse(null, null));
	}

	/** Новий код анулює попередній: ним уже не вступиш. */
	@Transactional
	public CodeResponse regenerateCode(UUID householdId, UUID userId) {
		var now = clock.instant();
		var code = codes.findById(householdId).orElseGet(() -> new HouseholdJoinCode(householdId));
		String value;
		do {
			value = JoinCodes.generate();
		}
		while (codes.existsByCode(value));
		code.regenerate(value, userId, now, now.plus(TTL));
		codes.save(code);
		return new CodeResponse(code.getCode(), code.getExpiresAt());
	}

	static String link(String publicUrl, String token) {
		return UriComponentsBuilder.fromUriString(publicUrl)
			.path("/lms/join")
			.queryParam("invite", token)
			.build()
			.toUriString();
	}

	static String roleLabel(HouseholdRole role) {
		return role == HouseholdRole.OWNER ? "Власник" : "Член сім'ї";
	}

	/** Лист не дійшов — запрошення лишається: власник може надіслати код сім'ї іншим способом. */
	private boolean send(HouseholdInvite invite, Membership inviter, String token) {
		LocalDate until = invite.getExpiresAt().atZone(today.zone()).toLocalDate();
		var mail = templates.render(invite.getEmail(), "Zero Waste Fridge — запрошення до «"
				+ inviter.getHousehold().getName() + "»", "household-invite",
				Map.of("inviter", inviter.getUser().getName(), "household", inviter.getHousehold().getName(),
						"roleLabel", roleLabel(invite.getRole()), "link", link(properties.publicUrl(), token),
						"expiresAt", until));
		try {
			mailer.send(mail);
			return true;
		}
		catch (MailException ex) {
			log.error("Could not send household invite {}", invite.getId(), ex);
			return false;
		}
	}

}
