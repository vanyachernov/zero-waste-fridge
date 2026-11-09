package ua.zwf.api.product;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

	/** Доступ лише в межах свого домогосподарства: чужий продукт виглядає так само, як неіснуючий. */
	Optional<Product> findByIdAndHouseholdId(UUID id, UUID householdId);

}
