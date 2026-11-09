package ua.zwf.api.household;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.zwf.api.auth.AppUserPrincipal;

@Tag(name = "household")
@RestController
@RequestMapping("/api/household/members")
class MemberController {

	private final MemberService members;

	MemberController(MemberService members) {
		this.members = members;
	}

	record RoleRequest(HouseholdRole role) {
	}

	@Operation(summary = "Household members with role and last activity")
	@GetMapping
	List<MemberResponse> list(@AuthenticationPrincipal AppUserPrincipal principal) {
		return members.list(principal.id());
	}

	@Operation(summary = "Change a member's role (owner only; 409 LAST_OWNER)")
	@PatchMapping("/{userId}")
	@RequiresPermission(HouseholdPermission.CHANGE_ROLES)
	MemberResponse changeRole(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID userId,
			@RequestBody RoleRequest request) {
		return members.changeRole(principal.id(), userId, request.role());
	}

	@Operation(summary = "Remove a member (owner) or leave the household (own id)")
	@DeleteMapping("/{userId}")
	ResponseEntity<Void> remove(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID userId) {
		members.remove(principal.id(), userId);
		return ResponseEntity.noContent().build();
	}

}
