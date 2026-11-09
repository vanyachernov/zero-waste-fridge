package ua.zwf.api.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import ua.zwf.api.household.Household;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.TestData;
import ua.zwf.api.user.User;
import ua.zwf.api.user.UserRepository;

/** B-10: міграція V4, мапінг сутності на PostgreSQL і обмеження БД. */
class ProductPersistenceIT extends IntegrationTest {

	@Autowired
	ProductRepository products;

	@Autowired
	HouseholdRepository households;

	@Autowired
	UserRepository users;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	TransactionTemplate tx;

	static final LocalDate TODAY = LocalDate.of(2026, 11, 9);

	static final Instant NOW = Instant.parse("2026-11-09T10:00:00Z");

	record Fixture(UUID householdId, UUID userId) {
	}

	Fixture fixture() {
		return tx.execute(status -> {
			var household = households.save(new Household("Сім'я Тест", NOW));
			var user = users.save(new User(TestData.uniqueEmail(), "Тест", "{noop}x", NOW));
			return new Fixture(household.getId(), user.getId());
		});
	}

	UUID save(Fixture f, ProductDetails details) {
		return tx.execute(status -> products
			.save(new Product(households.getReferenceById(f.householdId()), users.getReferenceById(f.userId()), details,
					NOW))
			.getId());
	}

	static ProductDetails milk() {
		return new ProductDetails("Молоко 2.5%", null, ProductCategory.DAIRY, StorageZone.DOOR, new BigDecimal("1.5"),
				Unit.LITERS, TODAY, TODAY.plusDays(5), 3);
	}

	@Test
	void roundTripsAllColumnsWithCodes() {
		var f = fixture();
		var id = save(f, milk());

		var row = jdbc.queryForMap("select * from product where id = ?", id);
		assertThat(row).containsEntry("category", "dairy")
			.containsEntry("zone", "door")
			.containsEntry("unit", "l")
			.containsEntry("status", "ACTIVE")
			.containsEntry("remind_before_days", 3)
			.containsEntry("household_id", f.householdId())
			.containsEntry("added_by", f.userId());
		assertThat((BigDecimal) row.get("quantity")).isEqualByComparingTo("1.5");

		var loaded = tx.execute(status -> products.findByIdAndHouseholdId(id, f.householdId()).orElseThrow().details());
		assertThat(loaded).isEqualTo(milk().withQuantityScale(3));
	}

	@Test
	void otherHouseholdCannotFindTheProduct() {
		var owner = fixture();
		var stranger = fixture();
		var id = save(owner, milk());

		assertThat(products.findByIdAndHouseholdId(id, stranger.householdId())).isEmpty();
		assertThat(products.findByIdAndHouseholdId(id, owner.householdId())).isPresent();
	}

	@Test
	void deletingHouseholdDeletesItsProductsButDeletingUserKeepsThem() {
		var f = fixture();
		var id = save(f, milk());

		jdbc.update("delete from app_user where id = ?", f.userId());
		assertThat(jdbc.queryForObject("select added_by from product where id = ?", UUID.class, id)).isNull();

		jdbc.update("delete from household where id = ?", f.householdId());
		assertThat(products.existsById(id)).isFalse();
	}

	@Test
	void databaseRejectsInvalidRows() {
		var f = fixture();
		var id = save(f, milk());

		assertThatThrownBy(() -> jdbc.update("update product set category = 'fish' where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
		assertThatThrownBy(() -> jdbc.update("update product set quantity = 0 where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
		assertThatThrownBy(() -> jdbc.update("update product set remind_before_days = 5 where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
		assertThatThrownBy(
				() -> jdbc.update("update product set effective_expires_at = expires_at + 1 where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
		// Закритий продукт має дату закриття, активний — ні
		assertThatThrownBy(() -> jdbc.update("update product set status = 'WASTED' where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
		assertThatThrownBy(() -> jdbc.update("update product set opened_at = purchased_at - 1 where id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void activeExpiryIndexExists() {
		var indexes = jdbc.queryForList("select indexname from pg_indexes where tablename = 'product'", String.class);
		assertThat(indexes).contains("product_household_expiry_ix", "product_household_created_ix");
	}

}
