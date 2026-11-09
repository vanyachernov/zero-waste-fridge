package ua.zwf.api.shopping;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShoppingSettingsRepository extends JpaRepository<ShoppingSettings, UUID> {
}
