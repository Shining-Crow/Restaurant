-- Mark Monday closed and refresh hours-strip copy for Amore Mio.
UPDATE "opening_hours"
SET "is_closed" = true,
    "note" = NULL
WHERE "weekday" = 1;

INSERT INTO "site_settings" ("key", "value", "updated_at") VALUES
  ('hours_strip_weekday_label', 'Tue–Thu & Sun', NOW()),
  ('hours_strip_weekday_time', '4:00pm – 10:00pm', NOW()),
  ('announcement_bar', 'To order takeaway, call us on 01246 938793 — we''re open from 4pm (closed Mondays).', NOW())
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "updated_at" = NOW();
