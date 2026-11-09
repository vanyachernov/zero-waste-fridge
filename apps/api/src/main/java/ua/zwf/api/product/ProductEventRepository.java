package ua.zwf.api.product;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductEventRepository extends JpaRepository<ProductEvent, UUID> {

	List<ProductEvent> findByProductIdOrderByOccurredAtAsc(UUID productId);

}
