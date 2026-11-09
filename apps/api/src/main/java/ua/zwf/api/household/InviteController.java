package ua.zwf.api.household;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.auth.CurrentUserResponse;

@Tag(name = "household")
@RestController
@RequestMapping("/api/household")
class InviteController {

	private final InviteService invites;

	private final JoinService joins;

	private final CurrentHousehold household;

	InviteController(InviteService invites, JoinService joins, CurrentHousehold household) {
		this.invites = invites;
		this.joins = joins;
		this.household = household;
	}

	record InviteRequest(@NotBlank @Email @Size(max = 254) String email, HouseholdRole role) {

		/** Пробіли довкола адреси (скопіювали з месенджера) — не помилка. */
		InviteRequest {
			email = email == null ? null : email.strip();
		}

	}

	@Operation(summary = "Invite by email (owner only); the mail links to /lms/join?invite=…")
	@PostMapping("/invites")
	@RequiresPermission(HouseholdPermission.MANAGE_MEMBERS)
	ResponseEntity<InviteService.InviteResponse> invite(@AuthenticationPrincipal AppUserPrincipal principal,
			@Valid @RequestBody InviteRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(invites.invite(principal.id(), request.email(), request.role()));
	}

	@Operation(summary = "Pending invites")
	@GetMapping("/invites")
	List<InviteService.InviteResponse> pending(@AuthenticationPrincipal AppUserPrincipal principal) {
		return invites.pending(household.idOf(principal.id()));
	}

	@Operation(summary = "Cancel an invite (owner only)")
	@DeleteMapping("/invites/{id}")
	@RequiresPermission(HouseholdPermission.MANAGE_MEMBERS)
	ResponseEntity<Void> cancel(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		invites.cancel(household.idOf(principal.id()), id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Current family code ZWF-XXXX-XX (owner only); code is null when there is none")
	@GetMapping("/invites/code")
	@RequiresPermission(HouseholdPermission.MANAGE_MEMBERS)
	InviteService.CodeResponse code(@AuthenticationPrincipal AppUserPrincipal principal) {
		return invites.code(household.idOf(principal.id()));
	}

	@Operation(summary = "Generate a new family code valid for 7 days (owner only)")
	@PostMapping("/invites/code")
	@RequiresPermission(HouseholdPermission.MANAGE_MEMBERS)
	InviteService.CodeResponse regenerateCode(@AuthenticationPrincipal AppUserPrincipal principal) {
		return invites.regenerateCode(household.idOf(principal.id()), principal.id());
	}

	@Operation(summary = "Join a household by family code or by the invite token from the mail")
	@PostMapping("/join")
	CurrentUserResponse join(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody JoinService.JoinRequest request) {
		return joins.join(principal.id(), request);
	}

}
