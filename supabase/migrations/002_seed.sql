-- Migration 002: seed campuses + Irvine spaces (from eSpace export)
insert into campuses (name, slug, sort_order) values
  ('Irvine', 'irvine', 1),
  ('Mission Viejo', 'mission-viejo', 2),
  ('Santa Ana', 'santa-ana', 3),
  ('Trabuco Canyon', 'trabuco-canyon', 4),
  ('Huntington Beach', 'huntington-beach', 5),
  ('Anaheim', 'anaheim', 6);

do $$
declare
  cid uuid;
  b_chapel uuid; b_cc uuid; b_kids uuid; b_mc uuid; b_wc uuid; b_youth uuid; b_park uuid;
begin
  select id into cid from campuses where slug = 'irvine';

  insert into buildings (campus_id, name, sort_order) values (cid, 'Chapel', 1) returning id into b_chapel;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Community Center', 2) returning id into b_cc;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Kids Building', 3) returning id into b_kids;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Ministry Center', 4) returning id into b_mc;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Worship Center', 5) returning id into b_wc;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Youth Building', 6) returning id into b_youth;
  insert into buildings (campus_id, name, sort_order) values (cid, 'Parking Lots', 7) returning id into b_park;

  insert into spaces (campus_id, building_id, name, capacity, amenities, sort_order) values
  -- Chapel
  (cid, b_chapel, 'Chapel Sanctuary', 260, '{}', 1),
  (cid, b_chapel, 'Bride''s Room', null, '{}', 2),
  (cid, b_chapel, 'Groom''s Room', null, '{}', 3),
  (cid, b_chapel, 'Chapel Patio', null, '{}', 4),
  -- Community Center
  (cid, b_cc, 'CC Auditorium', 1400, '{Computer,"DVD/Blu-Ray","Full Tech Set-Up","Handheld Mic"}', 1),
  (cid, b_cc, 'Lighthouse Room', 250, '{}', 2),
  (cid, b_cc, 'Community Center Courtyard', null, '{}', 3),
  (cid, b_cc, 'Coffee Stand Patio', null, '{}', 4),
  (cid, b_cc, 'Courtyard Room 1', null, '{}', 5),
  (cid, b_cc, 'Courtyard Room 2', null, '{}', 6),
  (cid, b_cc, 'Courtyard Room 3', null, '{}', 7),
  (cid, b_cc, 'Courtyard Room 4', null, '{}', 8),
  (cid, b_cc, 'Courtyard Room 5', null, '{}', 9),
  (cid, b_cc, 'Courtyard Room 6', null, '{}', 10),
  -- Kids Building (1st floor / Preschool)
  (cid, b_kids, 'Kids First Floor Lobby', null, '{}', 1),
  (cid, b_kids, 'PS-101', null, '{}', 2),
  (cid, b_kids, 'PS-102', null, '{}', 3),
  (cid, b_kids, 'PS-103', null, '{}', 4),
  (cid, b_kids, 'PS-104', null, '{}', 5),
  (cid, b_kids, 'PS-105', null, '{}', 6),
  (cid, b_kids, 'PS-106', null, '{}', 7),
  (cid, b_kids, 'PS-107', null, '{}', 8),
  (cid, b_kids, 'PS-108', null, '{}', 9),
  (cid, b_kids, 'PS-109', null, '{}', 10),
  (cid, b_kids, 'PS-110', null, '{}', 11),
  (cid, b_kids, 'PS-111', null, '{}', 12),
  (cid, b_kids, 'PS-112', null, '{}', 13),
  (cid, b_kids, '112A - EC Sensory', null, '{}', 14),
  (cid, b_kids, 'PS Leader Lounge', null, '{}', 15),
  -- Kids 2nd floor
  (cid, b_kids, '200 - K/1st Grade', null, '{"Full Tech Set-Up"}', 16),
  (cid, b_kids, 'KIDS-201', null, '{}', 17),
  (cid, b_kids, 'KIDS-202A', null, '{}', 18),
  (cid, b_kids, 'KIDS-202B', null, '{}', 19),
  (cid, b_kids, 'KIDS-203', null, '{}', 20),
  (cid, b_kids, 'KIDS-204 - Leader Lounge', null, '{}', 21),
  (cid, b_kids, 'KIDS-205 - Elm Sensory', null, '{}', 22),
  (cid, b_kids, 'KIDS-206', null, '{}', 23),
  (cid, b_kids, 'KIDS-207', null, '{}', 24),
  (cid, b_kids, 'KIDS-208A', null, '{}', 25),
  (cid, b_kids, 'KIDS-208B', null, '{}', 26),
  (cid, b_kids, '209 - 2nd/3rd Grade', null, '{"Full Tech Set-Up"}', 27),
  (cid, b_kids, '210 - 4th/5th Grade', null, '{"Full Tech Set-Up"}', 28),
  (cid, b_kids, 'Kids 2nd Floor Lobby', null, '{}', 29),
  -- Ministry Center 1st floor
  (cid, b_mc, 'MC 100 - Outdoor', 12, '{"Soft Seating"}', 1),
  (cid, b_mc, 'MC-101', 20, '{"Conference Table"}', 2),
  (cid, b_mc, 'MC-103', 15, '{"Conference Table"}', 3),
  (cid, b_mc, 'MC-104', 14, '{"Conference Table",HDMI,TV}', 4),
  (cid, b_mc, 'MC-105', 15, '{"Conference Table",HDMI,TV}', 5),
  (cid, b_mc, 'MC-106', 18, '{HDMI,"Soft Seating",TV}', 6),
  (cid, b_mc, 'MC-107', 15, '{"Conference Table",HDMI,TV}', 7),
  (cid, b_mc, 'MC-108', 20, '{HDMI,"Soft Seating",TV}', 8),
  (cid, b_mc, 'MC-109', 20, '{"Conference Table",HDMI,TV}', 9),
  (cid, b_mc, 'MC-110', 18, '{HDMI,"Soft Seating",TV}', 10),
  (cid, b_mc, 'MC-111', 15, '{"Conference Table"}', 11),
  (cid, b_mc, 'MC-112', 20, '{HDMI,"Soft Seating",TV}', 12),
  (cid, b_mc, 'MC-114', 20, '{HDMI,"Soft Seating",TV}', 13),
  (cid, b_mc, 'MC-116', 18, '{HDMI,"Soft Seating",TV}', 14),
  (cid, b_mc, 'MC-118', 24, '{HDMI,"Soft Seating",TV}', 15),
  (cid, b_mc, 'MC-120', 24, '{HDMI,"Soft Seating",TV}', 16),
  (cid, b_mc, 'MC-122', 23, '{"Conference Table",HDMI,TV}', 17),
  (cid, b_mc, 'MC-124', 23, '{"Conference Table",HDMI,TV}', 18),
  (cid, b_mc, 'MC-126A', 20, '{"Soft Seating"}', 19),
  (cid, b_mc, 'MC-126B', 20, '{"Soft Seating"}', 20),
  (cid, b_mc, 'MC-126C', 15, '{"Conference Table"}', 21),
  (cid, b_mc, 'MC-128 - Outdoor', 12, '{"Soft Seating"}', 22),
  -- Ministry Center 2nd floor
  (cid, b_mc, 'MC-200A', 15, '{TV}', 23),
  (cid, b_mc, 'MC-200B', 80, '{}', 24),
  (cid, b_mc, 'MC-200BC', 220, '{Computer,"DVD/Blu-Ray","Handheld Mic",HDMI,"Lapel Mic"}', 25),
  (cid, b_mc, 'MC-200C', 100, '{}', 26),
  (cid, b_mc, 'MC-204', 55, '{"DVD/Blu-Ray",HDMI,Projector,Screen,TV}', 27),
  (cid, b_mc, 'MC-205', 55, '{"AV Equip","DVD/Blu-Ray",HDMI,Projector,Screen}', 28),
  (cid, b_mc, 'MC-206', 85, '{"AV Equip","DVD/Blu-Ray",HDMI,Projector,Screen}', 29),
  (cid, b_mc, 'MC-207', 50, '{"DVD/Blu-Ray",HDMI,Projector,Screen,TV}', 30),
  (cid, b_mc, 'MC-208', 300, '{Computer,"DVD/Blu-Ray","Handheld Mic",HDMI,"Lapel Mic",Projector}', 31),
  (cid, b_mc, 'MC-209', 14, '{TV}', 32),
  -- Ministry Center 3rd floor
  (cid, b_mc, 'MC Balcony', null, '{}', 33),
  (cid, b_mc, 'Small Conference Room', 6, '{}', 34),
  (cid, b_mc, 'MC Lounge', null, '{}', 35),
  (cid, b_mc, 'Operations Conference Room', 8, '{}', 36),
  -- Worship Center
  (cid, b_wc, 'Sanctuary', 3200, '{"Full Tech Set-Up"}', 1),
  (cid, b_wc, 'Upper Room', 400, '{Computer,"DVD/Blu-Ray","Full Tech Set-Up","Handheld Mic"}', 2),
  (cid, b_wc, 'Foyer', 200, '{}', 3),
  (cid, b_wc, 'Lobby', null, '{}', 4),
  (cid, b_wc, 'Cafe', null, '{}', 5),
  (cid, b_wc, 'Baptismal', null, '{}', 6),
  (cid, b_wc, 'Creative Development Room', null, '{}', 7),
  (cid, b_wc, 'Outdoor Worship Center', null, '{}', 8),
  (cid, b_wc, 'Olive Trees', null, '{}', 9),
  (cid, b_wc, 'WC Patio', null, '{}', 10),
  (cid, b_wc, 'Prayer Room 172', 16, '{}', 11),
  (cid, b_wc, 'Prayer Room 174', 4, '{}', 12),
  (cid, b_wc, 'Prayer Room 175', 4, '{}', 13),
  (cid, b_wc, 'Prayer Room Lobby 177', 12, '{}', 14),
  (cid, b_wc, 'Prayer Room 178', 4, '{}', 15),
  (cid, b_wc, 'Prayer Room 179', 4, '{}', 16),
  (cid, b_wc, 'Studio', null, '{}', 17),
  (cid, b_wc, 'Studio A', null, '{}', 18),
  -- Youth Building
  (cid, b_youth, 'Youth Room 1', 250, '{"Full Tech Set-Up"}', 1),
  (cid, b_youth, 'Youth Room 2', 200, '{"Full Tech Set-Up"}', 2),
  (cid, b_youth, 'Youth Courtyard', null, '{}', 3),
  (cid, b_youth, 'Amphitheater', null, '{}', 4),
  (cid, b_youth, 'Basketball Court', null, '{}', 5),
  (cid, b_youth, '1st Floor Lounge', null, '{}', 6),
  (cid, b_youth, '2nd Floor Lounge', null, '{}', 7),
  (cid, b_youth, '2nd Floor Fenced Lounge', null, '{}', 8),
  (cid, b_youth, 'Youth Balcony', null, '{}', 9),
  -- Parking Lots
  (cid, b_park, 'Chapel Lot', null, '{}', 1),
  (cid, b_park, 'Community Center Lot', null, '{}', 2),
  (cid, b_park, 'Limited Mobility Lot', null, '{}', 3),
  (cid, b_park, 'Outdoor Worship Center Lot', null, '{}', 4),
  (cid, b_park, 'Parking Structure', null, '{}', 5),
  (cid, b_park, 'Upper Lot', null, '{}', 6),
  (cid, b_park, 'Volunteer Lot', null, '{}', 7),
  (cid, b_park, 'Worship Center Lot', null, '{}', 8),
  (cid, b_park, 'Youth Lot', null, '{}', 9);
end $$;
