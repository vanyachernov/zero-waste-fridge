package ua.zwf.api.activity;

import java.time.Instant;
import java.util.List;

/** Нові зверху. {@code nextBefore} — передати як {@code ?before=}, щоб отримати старіші; {@code null} — кінець. */
public record ActivityPage(List<ActivityEntry> items, Instant nextBefore) {
}
