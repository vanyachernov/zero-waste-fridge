package ua.zwf.api.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, UUID> {

	List<NotificationSettings> findByUserIdIn(List<UUID> userIds);

}
