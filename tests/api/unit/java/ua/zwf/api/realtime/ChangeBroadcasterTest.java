package ua.zwf.api.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChangeBroadcasterTest {

	@Test
	void topicsIncludeSideEffects() {
		assertThat(ChangeBroadcaster.topics("/api/products")).containsExactly("products");
		assertThat(ChangeBroadcaster.topics("/api/products/1/write-off")).containsExactly("products", "shopping-list");
		assertThat(ChangeBroadcaster.topics("/api/shopping-list/1/toggle")).containsExactly("shopping-list");
		assertThat(ChangeBroadcaster.topics("/api/shopping-list/move-to-fridge")).containsExactly("shopping-list", "products");
		assertThat(ChangeBroadcaster.topics("/api/household/members/1")).containsExactly("household");
		assertThat(ChangeBroadcaster.topics("/api/household/presence")).isEmpty();
		assertThat(ChangeBroadcaster.topics("/api/auth/login")).isEmpty();
		assertThat(ChangeBroadcaster.topics("/api/notifications/read-all")).isEmpty();
	}

	@Test
	void presenceListsEachUserOnceWithShoppingStore() {
		var hub = new RealtimeHub();
		var household = UUID.randomUUID();
		var olena = UUID.randomUUID();
		var maksym = UUID.randomUUID();
		hub.connect(household, olena, "Олена");
		hub.connect(household, olena, "Олена"); // друга вкладка
		hub.connect(household, maksym, "Максим");
		hub.connect(UUID.randomUUID(), UUID.randomUUID(), "Сусід");

		hub.shopping(household, maksym, "Сільпо");

		assertThat(hub.presence(household).online()).containsExactly(
				new RealtimeHub.PresenceEntry(maksym, "Максим", "Сільпо"),
				new RealtimeHub.PresenceEntry(olena, "Олена", null));
		assertThat(hub.connectionCount()).isEqualTo(4);
	}

}
