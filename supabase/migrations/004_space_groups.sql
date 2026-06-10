-- Migration 004: nested space groups (eSpace hierarchy: building → floor/group → space)
alter table spaces add column if not exists group_name text;

-- Kids Building
update spaces set group_name = '1st Floor' where name in ('Kids First Floor Lobby');
update spaces set group_name = '1st Floor — Preschool' where name like 'PS-1%' or name in ('112A - EC Sensory','PS Leader Lounge');
update spaces set group_name = '2nd Floor' where name like 'KIDS-%' or name in ('200 - K/1st Grade','209 - 2nd/3rd Grade','210 - 4th/5th Grade','Kids 2nd Floor Lobby');

-- Ministry Center
update spaces set group_name = '1st Floor' where name like 'MC-1%' or name in ('MC 100 - Outdoor','MC 128 - Outdoor');
update spaces set group_name = '2nd Floor' where name like 'MC-2%';
update spaces set group_name = '3rd Floor' where name in ('MC Balcony','Small Conference Room','MC Lounge','Operations Conference Room');

-- Worship Center
update spaces set group_name = 'Prayer Rooms' where name like 'Prayer Room%';
update spaces set group_name = 'Studio' where name in ('Studio','Studio A');
