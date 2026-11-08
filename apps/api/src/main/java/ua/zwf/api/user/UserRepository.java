package ua.zwf.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

	/** @param email нормалізований email */
	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

}
