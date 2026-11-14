package ua.zwf.api.shopping;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StoreRepository extends JpaRepository<Store, UUID> {

	@Query("select s from Store s where s.household.id = :household order by lower(s.name)")
	List<Store> findByHousehold(@Param("household") UUID householdId);

	Optional<Store> findByIdAndHouseholdId(UUID id, UUID householdId);

	@Query("select count(s) > 0 from Store s where s.household.id = :household and lower(s.name) = lower(:name)")
	boolean existsByName(@Param("household") UUID householdId, @Param("name") String name);

}
