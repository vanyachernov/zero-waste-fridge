package ua.zwf.api.household;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

	@Query("select m.role from Membership m where m.user.id = :userId")
	Optional<HouseholdRole> findRoleByUserId(@Param("userId") UUID userId);

	@Query("select count(m) from Membership m where m.household.id = :householdId")
	long countByHouseholdId(@Param("householdId") UUID householdId);

	@Query("select m.household.id from Membership m where m.user.id = :userId")
	Optional<UUID> findHouseholdIdByUserId(@Param("userId") UUID userId);

	@Query("select m from Membership m join fetch m.household join fetch m.user where m.user.id = :userId")
	Optional<Membership> findWithHouseholdByUserId(@Param("userId") UUID userId);

}
