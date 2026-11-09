package ua.zwf.api.product;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

	/** Автор підвантажується одразу — без N+1 запитів на сторінку списку. */
	@Override
	@EntityGraph(attributePaths = "addedBy")
	Page<Product> findAll(Specification<Product> spec, Pageable pageable);

	/** Доступ лише в межах свого домогосподарства: чужий продукт виглядає так само, як неіснуючий. */
	@EntityGraph(attributePaths = "addedBy")
	Optional<Product> findByIdAndHouseholdId(UUID id, UUID householdId);

}
