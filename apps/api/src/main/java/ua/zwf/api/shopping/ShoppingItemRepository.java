package ua.zwf.api.shopping;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, UUID> {

	@EntityGraph(attributePaths = { "addedBy", "boughtBy", "sourceProduct", "store" })
	List<ShoppingItem> findByHouseholdId(UUID householdId);

	@EntityGraph(attributePaths = { "addedBy", "boughtBy", "sourceProduct", "store" })
	Optional<ShoppingItem> findByIdAndHouseholdId(UUID id, UUID householdId);

	/** Не дублюємо: та сама назва (без регістру) уже чекає на покупку. */
	@Query("""
			select i from ShoppingItem i
			where i.household.id = :household and i.boughtAt is null and lower(i.name) = lower(:name)""")
	List<ShoppingItem> findOpenByName(@Param("household") UUID householdId, @Param("name") String name);

	/** B-41: «Очистити куплені» одним запитом. */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("delete from ShoppingItem i where i.household.id = :household and i.boughtAt is not null")
	int deleteBought(@Param("household") UUID householdId);

	@Query("""
			select coalesce(sum(case when i.boughtAt is not null then 1 else 0 end), 0),
			       count(i),
			       coalesce(sum(i.priceEstimate), 0),
			       coalesce(sum(case when i.boughtAt is null and i.source = ua.zwf.api.shopping.ShoppingSource.AUTO
			                         then 1 else 0 end), 0)
			from ShoppingItem i where i.household.id = :household""")
	List<Object[]> summary(@Param("household") UUID householdId);

}
