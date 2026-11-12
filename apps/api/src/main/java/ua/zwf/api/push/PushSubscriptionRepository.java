package ua.zwf.api.push;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {

	Optional<PushSubscription> findByEndpoint(String endpoint);

	List<PushSubscription> findByUserIdIn(List<UUID> userIds);

	long deleteByEndpointAndUserId(String endpoint, UUID userId);

}
