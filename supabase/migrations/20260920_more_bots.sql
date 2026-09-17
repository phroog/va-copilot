-- =============================================================
-- Sari Learn — realistic bot names + unique constraint so bots can be
-- re-seeded safely. XP/tier are spread deterministically.
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leaderboard_bots_name_key' and conrelid = 'leaderboard_bots'::regclass) then
    alter table leaderboard_bots add constraint leaderboard_bots_name_key unique (name);
  end if;
end $$;

insert into leaderboard_bots (name, avatar, base_xp, tier)
select
  n.name,
  (array[U&'\+01F451', U&'\+01F48E', U&'\+01F680', U&'\+01F9F2', U&'\+01F4C8', U&'\+01F331', U&'\+01F954', U&'\+01F423'])[1 + ((n.rn * 5) % 8)],
  (n.rn * 107) % 7600 + 25,
  1 + floor(((n.rn * 37) % 70) / 10)
from (values
  ('Aisha Rahman', 1),
  ('Mateo Silva', 2),
  ('Yuki Tanaka', 3),
  ('Sofia Rossi', 4),
  ('Liam Walsh', 5),
  ('Amara Okafor', 6),
  ('Jonas Weber', 7),
  ('Elena Petrova', 8),
  ('Hana Kim', 9),
  ('Ravi Patel', 10),
  ('Zara Khan', 11),
  ('Lucas Ferreira', 12),
  ('Mia Johansson', 13),
  ('Omar Haddad', 14),
  ('Nina Novak', 15),
  ('Diego Torres', 16),
  ('Emma Kowalski', 17),
  ('Tobias Berg', 18),
  ('Layla Farah', 19),
  ('Noah Bennett', 20),
  ('Camila Rojas', 21),
  ('Ethan Park', 22),
  ('Priya Sharma', 23),
  ('Mateo Costa', 24),
  ('Ingrid Larsen', 25),
  ('Kwame Mensah', 26),
  ('Alina Ivanova', 27),
  ('Gabriel Sousa', 28),
  ('Chloe Martin', 29),
  ('Kenji Nakamura', 30),
  ('Fatima Al Sayed', 31),
  ('Oscar Lindqvist', 32),
  ('Anika Mehta', 33),
  ('Tomasz Nowak', 34),
  ('Lucia Herrera', 35),
  ('Dmytro Koval', 36),
  ('Sara Albrecht', 37),
  ('Rafael Santos', 38),
  ('Mei Ling', 39),
  ('Nikolas Papas', 40),
  ('Isla Morrison', 41),
  ('Pedro Alves', 42),
  ('Bianca Moretti', 43),
  ('Haruto Sato', 44),
  ('Malika Diallo', 45),
  ('Felix Wagner', 46),
  ('Zara Yilmaz', 47),
  ('Marco Bellini', 48),
  ('Nadia Khalil', 49),
  ('Ivan Petrov', 50),
  ('Hugo Laurent', 51),
  ('Dmitri Volkov', 52),
  ('Elif Demir', 53),
  ('Antoine Girard', 54),
  ('Freya Andersen', 55),
  ('Chen Wei', 56),
  ('Valentina Romero', 57),
  ('Nikolai Sokolov', 58),
  ('Amelie Dubois', 59),
  ('Juan Castillo', 60),
  ('Mira Steiner', 61),
  ('Abdul Karim', 62),
  ('Elena Marinova', 63),
  ('Kofi Boateng', 64),
  ('Isabelle Rousseau', 65),
  ('Henrik Nielsen', 66),
  ('Ava Thornton', 67),
  ('Leo Marques', 68),
  ('Mila Johansson', 69),
  ('Arjun Nair', 70),
  ('Celine Roche', 71),
  ('Emilio Vargas', 72),
  ('Noor Saleh', 73),
  ('Mika Aalto', 74),
  ('Rosa Lindgren', 75)
) as n(name, rn)
on conflict (name) do nothing;
