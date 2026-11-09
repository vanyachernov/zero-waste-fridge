package ua.zwf.api.shopping;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.household.HouseholdRepository;

/** B-44: магазини домогосподарства. */
@Service
public class StoreService {

	public record StoreResponse(UUID id, String name) {

		static StoreResponse of(Store store) {
			return store == null ? null : new StoreResponse(store.getId(), store.getName());
		}

	}

	private final StoreRepository stores;

	private final HouseholdRepository households;

	private final Clock clock;

	public StoreService(StoreRepository stores, HouseholdRepository households, Clock clock) {
		this.stores = stores;
		this.households = households;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<StoreResponse> list(UUID householdId) {
		return stores.findByHousehold(householdId).stream().map(StoreResponse::of).toList();
	}

	@Transactional
	public StoreResponse create(UUID householdId, String rawName) {
		String name = rawName == null ? null : rawName.strip().replaceAll("\\s+", " ");
		if (name == null) {
			throw new ValidationException(Map.of("name", "NotNull"));
		}
		if (name.isEmpty()) {
			throw new ValidationException(Map.of("name", "NotBlank"));
		}
		if (name.length() > Store.NAME_MAX) {
			throw new ValidationException(Map.of("name", "Size"));
		}
		if (stores.existsByName(householdId, name)) {
			throw new StoreExistsException();
		}
		try {
			return StoreResponse.of(stores.saveAndFlush(new Store(households.getReferenceById(householdId), name,
					clock.instant())));
		}
		catch (DataIntegrityViolationException race) {
			// Двоє учасників одночасно додали той самий магазин — унікальний індекс спрацював
			throw new StoreExistsException();
		}
	}

	@Transactional
	public void delete(UUID householdId, UUID storeId) {
		stores.delete(find(householdId, storeId));
	}

	Store find(UUID householdId, UUID storeId) {
		return stores.findByIdAndHouseholdId(storeId, householdId).orElseThrow(StoreNotFoundException::new);
	}

}
