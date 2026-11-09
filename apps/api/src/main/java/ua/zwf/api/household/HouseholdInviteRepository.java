package ua.zwf.api.household;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HouseholdInviteRepository extends JpaRepository<HouseholdInvite, UUID> {

	@Query("""
			select i from HouseholdInvite i left join fetch i.invitedBy
			where i.household.id = :household and i.acceptedAt is null and i.expiresAt > :now
			order by i.createdAt desc""")
	List<HouseholdInvite> findPending(@Param("household") UUID householdId, @Param("now") Instant now);

	@Query("select i from HouseholdInvite i where i.household.id = :household and i.email = :email and i.acceptedAt is null")
	Optional<HouseholdInvite> findOpen(@Param("household") UUID householdId, @Param("email") String email);

	@Query("select i from HouseholdInvite i join fetch i.household where i.tokenHash = :hash")
	Optional<HouseholdInvite> findByTokenHash(@Param("hash") String tokenHash);

	Optional<HouseholdInvite> findByIdAndHouseholdId(UUID id, UUID householdId);

	@Modifying(flushAutomatically = true)
	@Query("delete from HouseholdInvite i where i.id = :id")
	void deleteNow(@Param("id") UUID id);

}
