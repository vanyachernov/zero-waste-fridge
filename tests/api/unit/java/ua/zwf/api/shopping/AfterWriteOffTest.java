package ua.zwf.api.shopping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.zwf.api.household.Household;
import ua.zwf.api.household.HouseholdRepository;
import ua.zwf.api.product.Product;
import ua.zwf.api.product.ProductCategory;
import ua.zwf.api.product.ProductDetails;
import ua.zwf.api.product.StorageZone;
import ua.zwf.api.product.Unit;
import ua.zwf.api.product.WriteOffOutcome;
import ua.zwf.api.user.UserRepository;

/** B-13 + B-43: галочка «Додати до списку покупок» — true / false (явно ні, Smart Sync теж) / відсутня. */
@ExtendWith(MockitoExtension.class)
class AfterWriteOffTest {

	static final Instant NOW = Instant.parse("2026-11-16T10:00:00Z");

	@Mock
	ShoppingItemRepository items;

	@Mock
	StoreRepository stores;

	@Mock
	ShoppingSettingsService settings;

	@Mock
	HouseholdRepository households;

	@Mock
	UserRepository users;

	ShoppingListService service;

	@BeforeEach
	void setUp() {
		service = new ShoppingListService(items, stores, settings, households, users, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	static Product finishedYogurt() {
		var product = new Product(new Household("Сім'я", NOW), null, new ProductDetails("Йогурт", null,
				ProductCategory.DAIRY, StorageZone.DOOR, new BigDecimal("1"), Unit.LITERS, null,
				LocalDate.of(2026, 11, 18), 1), NOW);
		product.writeOff(WriteOffOutcome.EATEN, null, NOW);
		return product;
	}

	@Test
	void uncheckedBoxWinsOverSmartSync() {
		var added = service.afterWriteOff(finishedYogurt(), null, WriteOffOutcome.EATEN, BigDecimal.ONE, false);

		assertThat(added).isFalse();
		verifyNoInteractions(settings);
		verify(items, never()).save(any());
	}

	@Test
	void withoutTheFieldSmartSyncDecides() {
		when(settings.of(any())).thenReturn(new ShoppingSettings(UUID.randomUUID()));
		when(items.save(any())).thenAnswer(call -> call.getArgument(0));

		var added = service.afterWriteOff(finishedYogurt(), null, WriteOffOutcome.EATEN, BigDecimal.ONE, null);

		assertThat(added).isTrue();
		var saved = ArgumentCaptor.forClass(ShoppingItem.class);
		verify(items).save(saved.capture());
		assertThat(saved.getValue().getSource()).isEqualTo(ShoppingSource.AUTO);
	}

	@Test
	void checkedBoxAddsAsWriteOff() {
		when(items.save(any())).thenAnswer(call -> call.getArgument(0));

		var added = service.afterWriteOff(finishedYogurt(), null, WriteOffOutcome.EATEN, BigDecimal.ONE, true);

		assertThat(added).isTrue();
		var saved = ArgumentCaptor.forClass(ShoppingItem.class);
		verify(items).save(saved.capture());
		assertThat(saved.getValue().getSource()).isEqualTo(ShoppingSource.WRITE_OFF);
		assertThat(saved.getValue().getName()).isEqualTo("Йогурт");
	}

}
