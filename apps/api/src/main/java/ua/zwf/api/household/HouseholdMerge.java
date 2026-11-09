package ua.zwf.api.household;

import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Хто вступає в сім'ю зі свого «одиночного» домогосподарства, не втрачає даних: продукти, їхня історія
 * і список покупок переїжджають у спільний холодильник, а старе домогосподарство видаляється
 * (разом із магазинами, налаштуваннями й кодами — каскадом у БД).
 *
 * <p>Native SQL: колонки {@code household_id} у сутностях незмінні ({@code updatable = false}) — так і має
 * бути для звичайної роботи, а переїзд — свідома масова операція.
 */
@Component
class HouseholdMerge {

	private final EntityManager em;

	HouseholdMerge(EntityManager em) {
		this.em = em;
	}

	@Transactional(propagation = Propagation.MANDATORY)
	void moveDataAndDelete(UUID from, UUID to) {
		em.flush();
		update("update product set household_id = :to where household_id = :from", from, to);
		update("update product_event set household_id = :to where household_id = :from", from, to);
		// Магазини лишаються в старому домогосподарстві й видаляються — позиції переїжджають без магазину
		update("update shopping_item set household_id = :to, store_id = null where household_id = :from", from, to);
		em.createNativeQuery("delete from household where id = :from").setParameter("from", from).executeUpdate();
	}

	private void update(String sql, UUID from, UUID to) {
		em.createNativeQuery(sql).setParameter("from", from).setParameter("to", to).executeUpdate();
	}

}
