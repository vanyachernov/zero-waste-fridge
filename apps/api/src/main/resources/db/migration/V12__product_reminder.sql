-- B-31: для якого терміну вже надіслано нагадування. Змінився термін (відкрили упаковку, поправили дату) —
-- значення не збігається з effective_expires_at, і нагадування піде знову.
ALTER TABLE product ADD COLUMN reminder_sent_for DATE;

-- Пошук продуктів, яким час нагадати: лише активні, яким ще не нагадували про поточний термін
CREATE INDEX product_reminder_due_ix ON product (effective_expires_at) WHERE status = 'ACTIVE';
