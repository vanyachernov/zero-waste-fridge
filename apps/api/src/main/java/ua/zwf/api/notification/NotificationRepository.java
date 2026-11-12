package ua.zwf.api.notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

	/** Непрочитані першими, далі нові зверху; лише поточного домогосподарства (після переходу в іншу сім'ю старі не видно). */
	@Query("""
			select n from Notification n
			where n.userId = :user and n.householdId = :household
			order by case when n.readAt is null then 0 else 1 end, n.createdAt desc, n.id""")
	List<Notification> findFeed(@Param("user") UUID userId, @Param("household") UUID householdId, Pageable page);

	@Query("select count(n) from Notification n where n.userId = :user and n.householdId = :household and n.readAt is null")
	long countUnread(@Param("user") UUID userId, @Param("household") UUID householdId);

	Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("""
			update Notification n set n.readAt = :now
			where n.userId = :user and n.householdId = :household and n.readAt is null""")
	int markAllRead(@Param("user") UUID userId, @Param("household") UUID householdId, @Param("now") Instant now);

}
