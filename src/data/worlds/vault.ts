import type { Dataset } from '@/engine/types';

export const vault: Dataset = {
  id: 'vault',
  name: 'Ashgate Vault — Sub-level 4',
  blurb:
    'You are locked inside a research vault with a badge reader, a camera grid and eleven hours of air. The door logic lives in the security database. Read it or stay.',
  seed: `
CREATE TABLE departments (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  floor    INTEGER NOT NULL,
  head_id  INTEGER,
  budget   REAL
);
INSERT INTO departments (id, name, floor, head_id, budget) VALUES
  (1,'Cryptography',-4,3,880000),
  (2,'Facilities',0,7,120000),
  (3,'Bio-Archive',-2,11,1450000),
  (4,'Security',-1,5,640000),
  (5,'Legal',3,NULL,210000),
  (6,'Decommissioned Wing',-5,NULL,0);

CREATE TABLE employees (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  dept_id   INTEGER REFERENCES departments(id),
  title     TEXT NOT NULL,
  hired_on  TEXT NOT NULL,
  salary    REAL NOT NULL,
  manager_id INTEGER REFERENCES employees(id),
  clearance INTEGER NOT NULL,
  status    TEXT NOT NULL
);
INSERT INTO employees (id, name, dept_id, title, hired_on, salary, manager_id, clearance, status) VALUES
  (1,'Imani Osei',1,'Cryptanalyst','2016-03-01',96000,3,4,'active'),
  (2,'Petra Kovac',1,'Cryptanalyst','2019-07-15',88000,3,4,'active'),
  (3,'Yusuf Demir',1,'Head of Cryptography','2011-01-09',151000,NULL,5,'active'),
  (4,'Nora Lindqvist',4,'Security Analyst','2020-02-20',74000,5,3,'active'),
  (5,'Gabriel Rossi',4,'Chief of Security','2009-11-11',162000,NULL,5,'active'),
  (6,'Hana Sato',4,'Night Warden','2021-06-30',61000,5,3,'active'),
  (7,'Dermot Nally',2,'Facilities Lead','2014-05-05',70000,NULL,2,'active'),
  (8,'Ravi Chandra',2,'Technician','2022-09-12',48000,7,1,'active'),
  (9,'Lena Fischer',2,'Technician','2023-01-23',46500,7,1,'suspended'),
  (10,'Marco Villard',3,'Archivist','2017-04-18',82000,11,4,'active'),
  (11,'Aiko Tanaka',3,'Head of Bio-Archive','2012-08-02',147000,NULL,5,'active'),
  (12,'Sara Bergman',3,'Junior Archivist','2024-02-05',52000,11,2,'active'),
  (13,'Owen Pryce',NULL,'Contractor','2025-01-14',0,NULL,1,'contract'),
  (14,'Thea Moreau',NULL,'Auditor','2024-10-01',0,NULL,3,'contract'),
  (15,'Callum Reid',4,'Security Analyst','2018-12-03',77000,5,3,'terminated'),
  (16,'Priya Nair',1,'Research Fellow','2023-03-27',69000,3,3,'active'),
  (17,'Jonas Weber',5,'Counsel','2015-10-19',134000,NULL,2,'active'),
  (18,'Mila Horvat',3,'Archivist','2021-11-08',80000,11,4,'active');

CREATE TABLE keycards (
  id         INTEGER PRIMARY KEY,
  serial     TEXT NOT NULL UNIQUE,
  holder_id  INTEGER REFERENCES employees(id),
  issued_on  TEXT NOT NULL,
  revoked_on TEXT,
  level      INTEGER NOT NULL
);
INSERT INTO keycards (id, serial, holder_id, issued_on, revoked_on, level) VALUES
  (1,'AV-0001',1,'2016-03-01',NULL,4),
  (2,'AV-0002',2,'2019-07-15',NULL,4),
  (3,'AV-0003',3,'2011-01-09',NULL,5),
  (4,'AV-0004',4,'2020-02-20',NULL,3),
  (5,'AV-0005',5,'2009-11-11',NULL,5),
  (6,'AV-0006',6,'2021-06-30',NULL,3),
  (7,'AV-0007',7,'2014-05-05',NULL,2),
  (8,'AV-0008',8,'2022-09-12',NULL,1),
  (9,'AV-0009',9,'2023-01-23','2026-04-02',1),
  (10,'AV-0010',10,'2017-04-18',NULL,4),
  (11,'AV-0011',11,'2012-08-02',NULL,5),
  (12,'AV-0012',12,'2024-02-05',NULL,2),
  (13,'AV-0013',15,'2018-12-03','2025-08-30',3),
  (14,'AV-0014',16,'2023-03-27',NULL,3),
  (15,'AV-0015',18,'2021-11-08',NULL,4),
  (16,'AV-0016',NULL,'2013-05-05',NULL,5),
  (17,'AV-0017',NULL,'2010-02-02',NULL,4),
  (18,'AV-0018',14,'2024-10-01',NULL,3),
  (19,'AV-0019',13,'2025-01-14',NULL,1),
  (20,'AV-0020',17,'2015-10-19',NULL,2);

CREATE TABLE doors (
  id        INTEGER PRIMARY KEY,
  code      TEXT NOT NULL UNIQUE,
  zone      TEXT NOT NULL,
  floor     INTEGER NOT NULL,
  min_level INTEGER NOT NULL,
  is_exit   INTEGER NOT NULL DEFAULT 0,
  fail_mode TEXT NOT NULL
);
INSERT INTO doors (id, code, zone, floor, min_level, is_exit, fail_mode) VALUES
  (1,'D-ATRIUM','Atrium',0,1,1,'open'),
  (2,'D-STAIR-A','Stairwell',0,1,0,'open'),
  (3,'D-STAIR-B','Stairwell',-2,2,0,'open'),
  (4,'D-CRYPTO','Cryptography',-4,4,0,'locked'),
  (5,'D-BIO-1','Bio-Archive',-2,3,0,'locked'),
  (6,'D-BIO-2','Bio-Archive',-2,4,0,'locked'),
  (7,'D-VAULT','Vault Core',-4,5,0,'locked'),
  (8,'D-PLANT','Plant Room',-1,2,0,'open'),
  (9,'D-SERVER','Server Hall',-1,4,0,'locked'),
  (10,'D-LOADING','Loading Bay',0,2,1,'locked'),
  (11,'D-ROOF','Roof',4,3,1,'locked'),
  (12,'D-OLD-WING','Decommissioned Wing',-5,5,0,'locked'),
  (13,'D-LEGAL','Legal',3,1,0,'open'),
  (14,'D-TUNNEL','Service Tunnel',-5,4,1,'locked');

CREATE TABLE access_log (
  id         INTEGER PRIMARY KEY,
  card_id    INTEGER REFERENCES keycards(id),
  door_id    INTEGER NOT NULL REFERENCES doors(id),
  swiped_at  TEXT NOT NULL,
  granted    INTEGER NOT NULL,
  reason     TEXT
);
INSERT INTO access_log (id, card_id, door_id, swiped_at, granted, reason) VALUES
  (1,5,1,'2026-05-02 06:41',1,NULL),(2,5,2,'2026-05-02 06:42',1,NULL),
  (3,3,1,'2026-05-02 07:03',1,NULL),(4,3,4,'2026-05-02 07:11',1,NULL),
  (5,1,1,'2026-05-02 07:29',1,NULL),(6,1,4,'2026-05-02 07:35',1,NULL),
  (7,2,1,'2026-05-02 07:44',1,NULL),(8,2,4,'2026-05-02 07:51',1,NULL),
  (9,11,1,'2026-05-02 08:02',1,NULL),(10,11,5,'2026-05-02 08:10',1,NULL),
  (11,12,1,'2026-05-02 08:15',1,NULL),(12,12,5,'2026-05-02 08:19',0,'clearance'),
  (13,10,1,'2026-05-02 08:22',1,NULL),(14,10,5,'2026-05-02 08:26',1,NULL),
  (15,10,6,'2026-05-02 08:31',1,NULL),(16,15,1,'2026-05-02 08:40',1,NULL),
  (17,15,5,'2026-05-02 08:44',1,NULL),(18,7,1,'2026-05-02 08:55',1,NULL),
  (19,7,8,'2026-05-02 09:01',1,NULL),(20,8,1,'2026-05-02 09:04',1,NULL),
  (21,8,8,'2026-05-02 09:09',1,NULL),(22,8,9,'2026-05-02 09:12',0,'clearance'),
  (23,9,1,'2026-05-02 09:20',0,'revoked'),(24,9,1,'2026-05-02 09:21',0,'revoked'),
  (25,9,1,'2026-05-02 09:22',0,'revoked'),(26,13,1,'2026-05-02 09:31',0,'revoked'),
  (27,4,1,'2026-05-02 09:40',1,NULL),(28,4,9,'2026-05-02 09:47',0,'clearance'),
  (29,6,1,'2026-05-02 21:02',1,NULL),(30,6,2,'2026-05-02 21:04',1,NULL),
  (31,6,8,'2026-05-02 21:10',1,NULL),(32,6,9,'2026-05-02 21:14',0,'clearance'),
  (33,16,9,'2026-05-02 22:47',1,NULL),(34,16,7,'2026-05-02 22:53',1,NULL),
  (35,16,12,'2026-05-02 23:04',1,NULL),(36,16,14,'2026-05-02 23:19',1,NULL),
  (37,17,12,'2026-05-02 23:41',1,NULL),(38,17,7,'2026-05-03 00:02',0,'schedule'),
  (39,18,1,'2026-05-03 07:30',1,NULL),(40,18,13,'2026-05-03 07:36',1,NULL),
  (41,19,1,'2026-05-03 07:55',1,NULL),(42,19,8,'2026-05-03 08:02',0,'clearance'),
  (43,3,7,'2026-05-03 08:20',1,NULL),(44,3,7,'2026-05-03 08:59',1,NULL),
  (45,5,10,'2026-05-03 09:05',1,NULL),(46,5,11,'2026-05-03 09:30',1,NULL),
  (47,14,1,'2026-05-03 09:41',1,NULL),(48,14,4,'2026-05-03 09:48',0,'clearance'),
  (49,11,6,'2026-05-03 10:00',1,NULL),(50,11,7,'2026-05-03 10:12',1,NULL),
  (51,NULL,1,'2026-05-03 11:11',0,'unknown card'),
  (52,NULL,7,'2026-05-03 11:12',0,'unknown card'),
  (53,NULL,14,'2026-05-03 11:13',0,'unknown card');

CREATE TABLE shifts (
  id       INTEGER PRIMARY KEY,
  emp_id   INTEGER NOT NULL REFERENCES employees(id),
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  post      TEXT NOT NULL
);
INSERT INTO shifts (id, emp_id, starts_at, ends_at, post) VALUES
  (1,5,'2026-05-02 06:00','2026-05-02 14:00','Atrium'),
  (2,4,'2026-05-02 06:00','2026-05-02 14:00','Server Hall'),
  (3,6,'2026-05-02 21:00','2026-05-03 05:00','Sub-level 4'),
  (4,5,'2026-05-03 06:00','2026-05-03 14:00','Atrium'),
  (5,4,'2026-05-03 14:00','2026-05-03 22:00','Server Hall'),
  (6,6,'2026-05-03 22:00','2026-05-04 06:00','Sub-level 4'),
  (7,15,'2026-05-02 14:00','2026-05-02 22:00','Loading Bay'),
  (8,8,'2026-05-03 08:00','2026-05-03 16:00','Plant Room'),
  (9,7,'2026-05-03 08:00','2026-05-03 16:00','Plant Room');

CREATE TABLE cameras (
  id       INTEGER PRIMARY KEY,
  label    TEXT NOT NULL,
  zone     TEXT NOT NULL,
  floor    INTEGER NOT NULL,
  online   INTEGER NOT NULL
);
INSERT INTO cameras (id, label, zone, floor, online) VALUES
  (1,'CAM-A1','Atrium',0,1),(2,'CAM-A2','Atrium',0,1),
  (3,'CAM-S1','Stairwell',0,1),(4,'CAM-S2','Stairwell',-2,0),
  (5,'CAM-C1','Cryptography',-4,1),(6,'CAM-V1','Vault Core',-4,0),
  (7,'CAM-B1','Bio-Archive',-2,1),(8,'CAM-P1','Plant Room',-1,1),
  (9,'CAM-H1','Server Hall',-1,0),(10,'CAM-T1','Service Tunnel',-5,0),
  (11,'CAM-L1','Loading Bay',0,1),(12,'CAM-R1','Roof',4,1);

CREATE TABLE sensor_readings (
  id        INTEGER PRIMARY KEY,
  zone      TEXT NOT NULL,
  taken_at  TEXT NOT NULL,
  metric    TEXT NOT NULL,
  value     REAL NOT NULL
);
INSERT INTO sensor_readings (id, zone, taken_at, metric, value) VALUES
  (1,'Vault Core','2026-05-02 22:00','oxygen',20.9),
  (2,'Vault Core','2026-05-02 23:00','oxygen',20.4),
  (3,'Vault Core','2026-05-03 00:00','oxygen',19.8),
  (4,'Vault Core','2026-05-03 01:00','oxygen',19.1),
  (5,'Vault Core','2026-05-03 02:00','oxygen',18.5),
  (6,'Vault Core','2026-05-02 22:00','temp_c',18.0),
  (7,'Vault Core','2026-05-03 00:00','temp_c',19.6),
  (8,'Vault Core','2026-05-03 02:00','temp_c',21.4),
  (9,'Server Hall','2026-05-03 00:00','temp_c',27.9),
  (10,'Server Hall','2026-05-03 01:00','temp_c',29.4),
  (11,'Server Hall','2026-05-03 02:00','temp_c',31.2),
  (12,'Service Tunnel','2026-05-03 00:00','oxygen',20.8),
  (13,'Service Tunnel','2026-05-03 02:00','oxygen',20.7),
  (14,'Plant Room','2026-05-03 02:00','pressure',1.02),
  (15,'Plant Room','2026-05-03 03:00','pressure',0.94);

CREATE TABLE incidents (
  id        INTEGER PRIMARY KEY,
  door_id   INTEGER REFERENCES doors(id),
  raised_at TEXT NOT NULL,
  severity  INTEGER NOT NULL,
  summary   TEXT NOT NULL,
  closed    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO incidents (id, door_id, raised_at, severity, summary, closed) VALUES
  (1,9,'2026-05-02 22:48',4,'Server Hall opened by an unassigned card',0),
  (2,7,'2026-05-02 22:54',5,'Vault Core opened outside schedule',0),
  (3,12,'2026-05-02 23:05',5,'Decommissioned Wing entered',0),
  (4,14,'2026-05-02 23:20',5,'Service Tunnel exit used',0),
  (5,1,'2026-05-03 09:21',2,'Repeated denials on a revoked card',1),
  (6,NULL,'2026-05-03 11:14',3,'Three unknown-card swipes in one minute',0),
  (7,10,'2026-05-03 09:06',1,'Loading Bay held open for 40 seconds',1);
`,
};
