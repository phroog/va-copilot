-- =============================================================
-- Sari — expand the leaderboard to 2,000+ competitors so rank numbers
-- feel real and big. Names are built from first/last name pools; XP and
-- tier are spread deterministically. Existing names are skipped.
-- =============================================================

insert into leaderboard_bots (name, avatar, base_xp, tier)
select
  n.name,
  (array[U&'\+01F451', U&'\+01F48E', U&'\+01F680', U&'\+01F9F2', U&'\+01F4C8', U&'\+01F331', U&'\+01F954', U&'\+01F423'])[1 + ((n.rn * 3) % 8)],
  (n.rn * 7919) % 8600 + 15,
  1 + floor(((n.rn * 37) % 77) / 11)
from (
  select (f.f || ' ' || l.l) as name, row_number() over () as rn
  from (values
    ('Ava'),('Liam'),('Noah'),('Emma'),('Olivia'),('Ethan'),('Mia'),('Lucas'),('Sofia'),('Mateo'),('Aisha'),('Kenji'),('Priya'),('Diego'),('Yuki'),('Fatima'),('Jonas'),('Hana'),('Omar'),('Nina'),('Tobias'),('Lena'),('Marco'),('Chloe'),('Ken'),('Mei'),('Ravi'),('Zara'),('Ivan'),('Elif'),('Chen'),('Ingrid'),('Kwame'),('Alina'),('Dmitri'),('Camille'),('Oscar'),('Anika'),('Tomasz'),('Lucia'),('Dmytro'),('Sara'),('Rafael'),('Isla'),('Pedro'),('Bianca'),('Haruto'),('Malika'),('Felix'),('Nadia'),('Hugo'),('Freya'),('Valentina'),('Nikolai'),('Amelie'),('Juan'),('Mira'),('Abdul'),('Kofi'),('Isabelle')
  ) f(f),
  (values
    ('Smith'),('Johnson'),('Garcia'),('Muller'),('Rossi'),('Kim'),('Patel'),('Silva'),('Tanaka'),('Khan'),('Weber'),('Novak'),('Ferrari'),('Okafor'),('Haddad'),('Torres'),('Kowalski'),('Berg'),('Farah'),('Bennett'),('Rojas'),('Park'),('Sharma'),('Costa'),('Larsen'),('Mensah'),('Ivanova'),('Sousa'),('Martin'),('Nakamura'),('Lindqvist'),('Mehta'),('Nowak'),('Herrera'),('Koval')
  ) l(l)
) n
on conflict (name) do nothing;
