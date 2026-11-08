package ua.zwf.api.household;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

	@Query("select m from Membership m join fetch m.household join fetch m.user where m.user.id = :userId")
	Optional<Membership> findWithHouseholdByUserId(@Param("userId") UUID userId);

}
