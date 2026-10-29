import type { Dataset } from '@/engine/types';

export const blackwood: Dataset = {
  id: 'blackwood',
  name: 'Blackwood Manor — 4 November 1923',
  blurb:
    'Lord Alistair Blackwood died at 22:47 in a house holding twelve guests, eight staff and one missing letter opener. The constabulary keeps its notes in a database.',
  seed: `
CREATE TABLE rooms (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  floor  INTEGER NOT NULL,
  wing   TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0
);
INSERT INTO rooms (id, name, floor, wing, locked) VALUES
  (1,'Great Hall',0,'Centre',0),
  (2,'Library',0,'East',0),
  (3,'Study',1,'East',1),
  (4,'Conservatory',0,'West',0),
  (5,'Kitchen',-1,'North',0),
  (6,'Wine Cellar',-1,'North',1),
  (7,'Billiard Room',0,'West',0),
  (8,'Blue Bedroom',1,'West',0),
  (9,'Rose Bedroom',1,'West',0),
  (10,'Gallery',1,'Centre',0),
  (11,'Chapel',0,'North',0),
  (12,'Boathouse',0,'Lake',1);

CREATE TABLE guests (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  title       TEXT,
  age         INTEGER,
  room_id     INTEGER REFERENCES rooms(id),
  arrived_at  TEXT,
  invited_by  INTEGER REFERENCES guests(id),
  alibi_score INTEGER,
  is_family   INTEGER NOT NULL DEFAULT 0,
  home_city   TEXT
);
INSERT INTO guests (id, name, title, age, room_id, arrived_at, invited_by, alibi_score, is_family, home_city) VALUES
  (1,'Alistair Blackwood','Lord',67,3,'1923-11-01 12:00',NULL,NULL,1,'Blackwood'),
  (2,'Vivienne Blackwood','Lady',54,9,'1923-11-01 12:00',1,42,1,'Blackwood'),
  (3,'Rupert Blackwood','Mr',29,8,'1923-11-03 17:20',1,17,1,'London'),
  (4,'Cordelia Vance',NULL,31,9,'1923-11-03 18:05',2,88,0,'Paris'),
  (5,'Ambrose Finch','Dr',48,10,'1923-11-03 19:40',1,55,0,'Edinburgh'),
  (6,'Marguerite Vale','Mme',44,10,'1923-11-04 09:15',2,NULL,0,'Paris'),
  (7,'Hollis Crane','Mr',52,7,'1923-11-04 10:30',1,23,0,'New York'),
  (8,'Prudence Ashby','Miss',26,8,'1923-11-04 11:00',4,91,0,'London'),
  (9,'Silas Thorne','Mr',61,7,'1923-11-04 11:45',1,9,0,'Cairo'),
  (10,'Beatrice Lowell','Mrs',39,9,'1923-11-04 14:10',2,64,0,'Bath'),
  (11,'Nikolai Verenov','Count',58,10,'1923-11-04 15:35',NULL,31,0,'Riga'),
  (12,'Edwin Blackwood','Mr',34,8,'1923-11-04 16:50',NULL,NULL,1,'Manchester');

CREATE TABLE staff (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,
  hired_on      TEXT NOT NULL,
  supervisor_id INTEGER REFERENCES staff(id),
  shift         TEXT NOT NULL,
  wage_weekly   REAL NOT NULL
);
INSERT INTO staff (id, name, role, hired_on, supervisor_id, shift, wage_weekly) VALUES
  (1,'Gerald Mott','Butler','1897-03-14',NULL,'evening',4.50),
  (2,'Hannah Pike','Housekeeper','1901-06-02',1,'day',3.20),
  (3,'Tom Barrow','Footman','1919-09-30',1,'evening',1.80),
  (4,'Elsie Nye','Maid','1921-02-11',2,'day',1.40),
  (5,'Constance Wray','Cook','1908-08-19',2,'day',2.60),
  (6,'Jack Doyle','Groundskeeper','1915-04-05',NULL,'day',2.10),
  (7,'Martha Quill','Maid','1922-11-27',2,'night',1.35),
  (8,'Percy Kell','Chauffeur','1920-07-16',1,'evening',2.00);

CREATE TABLE movements (
  id       INTEGER PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  room_id  INTEGER NOT NULL REFERENCES rooms(id),
  seen_at  TEXT NOT NULL,
  noted_by INTEGER REFERENCES staff(id)
);
INSERT INTO movements (id, guest_id, room_id, seen_at, noted_by) VALUES
  (1,1,1,'1923-11-04 20:05',1),(2,2,1,'1923-11-04 20:05',1),
  (3,3,1,'1923-11-04 20:07',3),(4,4,1,'1923-11-04 20:09',3),
  (5,5,1,'1923-11-04 20:10',1),(6,6,1,'1923-11-04 20:12',NULL),
  (7,7,1,'1923-11-04 20:12',3),(8,8,1,'1923-11-04 20:15',4),
  (9,9,1,'1923-11-04 20:18',NULL),(10,10,1,'1923-11-04 20:20',4),
  (11,11,1,'1923-11-04 20:22',1),(12,12,1,'1923-11-04 20:31',3),
  (13,1,2,'1923-11-04 21:14',1),(14,5,2,'1923-11-04 21:20',NULL),
  (15,3,7,'1923-11-04 21:22',8),(16,9,7,'1923-11-04 21:25',8),
  (17,4,4,'1923-11-04 21:30',7),(18,8,4,'1923-11-04 21:31',7),
  (19,6,10,'1923-11-04 21:40',NULL),(20,11,10,'1923-11-04 21:44',NULL),
  (21,2,11,'1923-11-04 21:50',2),(22,10,11,'1923-11-04 21:52',2),
  (23,1,3,'1923-11-04 22:05',1),(24,12,10,'1923-11-04 22:08',NULL),
  (25,7,2,'1923-11-04 22:12',3),(26,5,5,'1923-11-04 22:15',5),
  (27,3,6,'1923-11-04 22:19',NULL),(28,9,12,'1923-11-04 22:24',6),
  (29,12,3,'1923-11-04 22:33',NULL),(30,7,3,'1923-11-04 22:41',NULL),
  (31,11,3,'1923-11-04 22:44',NULL),(32,12,10,'1923-11-04 22:52',3),
  (33,7,7,'1923-11-04 22:55',8),(34,11,10,'1923-11-04 22:58',NULL),
  (35,2,1,'1923-11-04 23:02',1),(36,4,9,'1923-11-04 23:05',7),
  (37,8,9,'1923-11-04 23:06',7),(38,10,1,'1923-11-04 23:10',1),
  (39,6,10,'1923-11-04 23:15',NULL),(40,3,8,'1923-11-04 23:20',3),
  (41,5,10,'1923-11-04 23:26',NULL),(42,9,7,'1923-11-04 23:31',8);

CREATE TABLE statements (
  id           INTEGER PRIMARY KEY,
  guest_id     INTEGER NOT NULL REFERENCES guests(id),
  given_at     TEXT NOT NULL,
  claim        TEXT NOT NULL,
  claimed_room INTEGER REFERENCES rooms(id),
  claimed_time TEXT,
  verified     INTEGER
);
INSERT INTO statements (id, guest_id, given_at, claim, claimed_room, claimed_time, verified) VALUES
  (1,2,'1923-11-05 08:10','I was at prayer in the chapel all evening.',11,'1923-11-04 21:50',1),
  (2,3,'1923-11-05 08:25','I never left the billiard room.',7,'1923-11-04 21:22',0),
  (3,4,'1923-11-05 08:40','Prudence and I took the air in the conservatory.',4,'1923-11-04 21:30',1),
  (4,5,'1923-11-05 09:02','I looked in on the kitchen for a tonic.',5,'1923-11-04 22:15',1),
  (5,6,'1923-11-05 09:20','The gallery held me the whole night.',10,'1923-11-04 21:40',1),
  (6,7,'1923-11-05 09:35','I read in the library until eleven.',2,'1923-11-04 22:12',0),
  (7,8,'1923-11-05 09:50','With Miss Vance, then to bed.',4,'1923-11-04 21:31',1),
  (8,9,'1923-11-05 10:05','I walked to the boathouse for a cigar.',12,'1923-11-04 22:24',1),
  (9,10,'1923-11-05 10:20','I accompanied Lady Blackwood to chapel.',11,'1923-11-04 21:52',1),
  (10,11,'1923-11-05 10:44','The gallery, admiring the Vermeer.',10,'1923-11-04 21:44',0),
  (11,12,'1923-11-05 11:00','I did not go near the study.',10,'1923-11-04 22:08',0),
  (12,3,'1923-11-05 14:30','Very well: I went to the cellar for brandy.',6,'1923-11-04 22:19',1),
  (13,7,'1923-11-05 15:10','I may have stepped out briefly.',NULL,NULL,NULL),
  (14,11,'1923-11-05 15:45','I decline to answer further.',NULL,NULL,NULL),
  (15,12,'1923-11-05 16:20','I went to the study to beg for money.',3,'1923-11-04 22:33',1);

CREATE TABLE items (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  room_id   INTEGER REFERENCES rooms(id),
  owner_id  INTEGER REFERENCES guests(id),
  is_weapon INTEGER NOT NULL DEFAULT 0,
  value_gbp REAL,
  found_at  TEXT
);
INSERT INTO items (id, name, room_id, owner_id, is_weapon, value_gbp, found_at) VALUES
  (1,'Silver letter opener',NULL,1,1,12.5,NULL),
  (2,'Duelling pistol',7,9,1,340.0,'1923-11-05 07:10'),
  (3,'Ivory cigarette case',3,11,0,88.0,'1923-11-05 07:14'),
  (4,'Emerald brooch',9,2,0,1250.0,'1923-11-05 07:20'),
  (5,'Bottle of laudanum',5,5,1,2.0,'1923-11-05 07:31'),
  (6,'Torn ledger page',3,NULL,0,NULL,'1923-11-05 07:33'),
  (7,'Muddy boot',12,9,0,1.5,'1923-11-05 07:48'),
  (8,'Blackwood signet ring',3,1,0,900.0,'1923-11-05 07:52'),
  (9,'Chapel candle',11,NULL,0,0.2,'1923-11-05 08:00'),
  (10,'Wine ledger',6,NULL,0,NULL,'1923-11-05 08:04'),
  (11,'Fireplace poker',3,NULL,1,4.0,'1923-11-05 08:09'),
  (12,'Bundle of letters',8,3,0,NULL,'1923-11-05 08:15'),
  (13,'Forged promissory note',10,12,0,5000.0,'1923-11-05 08:22'),
  (14,'Vial of prussic acid',NULL,NULL,1,3.0,NULL),
  (15,'Opera glasses',10,6,0,45.0,'1923-11-05 08:30');

CREATE TABLE calls (
  id          INTEGER PRIMARY KEY,
  caller_id   INTEGER REFERENCES guests(id),
  callee_name TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  duration_s  INTEGER NOT NULL,
  trunk_city  TEXT
);
INSERT INTO calls (id, caller_id, callee_name, started_at, duration_s, trunk_city) VALUES
  (1,7,'Crane & Sons Brokerage','1923-11-04 18:40',420,'New York'),
  (2,12,'Marlowe Bank','1923-11-04 19:05',95,'Manchester'),
  (3,11,'Unlisted','1923-11-04 21:02',31,'Riga'),
  (4,3,'Marlowe Bank','1923-11-04 21:58',210,'Manchester'),
  (5,7,'Unlisted','1923-11-04 22:35',48,NULL),
  (6,2,'Dr Ambrose Finch','1923-11-04 23:40',180,'Edinburgh'),
  (7,12,'Unlisted','1923-11-05 00:12',22,NULL),
  (8,9,'Cairo Antiquities','1923-11-05 01:30',600,'Cairo'),
  (9,4,'Vance Atelier','1923-11-05 09:00',330,'Paris'),
  (10,11,'Unlisted','1923-11-05 02:44',15,NULL);

CREATE TABLE autopsy (
  id           INTEGER PRIMARY KEY,
  finding      TEXT NOT NULL,
  category     TEXT NOT NULL,
  time_of_note TEXT NOT NULL,
  confidence   REAL
);
INSERT INTO autopsy (id, finding, category, time_of_note, confidence) VALUES
  (1,'Single puncture wound, left thorax','wound','1923-11-05 12:00',0.98),
  (2,'Blade width 9mm, tapered','wound','1923-11-05 12:05',0.81),
  (3,'Traces of prussic acid in the throat','toxicology','1923-11-05 13:40',0.44),
  (4,'Time of death 22:47 plus or minus 8 minutes','timing','1923-11-05 13:55',0.9),
  (5,'Defensive bruising, right forearm','wound','1923-11-05 14:10',0.72),
  (6,'Fibres of Riga wool under the fingernails','trace','1923-11-05 14:30',0.66),
  (7,'No sign of struggle in the stomach contents','other','1923-11-05 14:45',NULL);
`,
};
