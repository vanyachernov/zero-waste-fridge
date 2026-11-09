package ua.zwf.api.household;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HouseholdJoinCodeRepository extends JpaRepository<HouseholdJoinCode, UUID> {

	Optional<HouseholdJoinCode> findByCode(String code);

	boolean existsByCode(String code);

}
