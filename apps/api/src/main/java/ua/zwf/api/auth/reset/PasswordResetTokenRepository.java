package ua.zwf.api.auth.reset;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

	@Query("select t from PasswordResetToken t join fetch t.user where t.tokenHash = :hash")
	Optional<PasswordResetToken> findByTokenHash(@Param("hash") String tokenHash);

	/** Чи надсилали користувачу лист не раніше {@code since} (захист від спаму листами). */
	boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant since);

	/** Анулює всі ще не використані токени користувача (новий запит або успішне скидання). */
	@Modifying
	@Query("update PasswordResetToken t set t.usedAt = :now where t.user.id = :userId and t.usedAt is null")
	int invalidateAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);

}
