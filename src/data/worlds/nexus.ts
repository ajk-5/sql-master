import type { Dataset } from '@/engine/types';

export const nexus: Dataset = {
  id: 'nexus',
  name: 'The Ninth Floor — Nexus platform',
  blurb:
    'A dead architect left a schema that nobody can extend, a table of raw intake nobody dares normalise, and an index that makes the whole floor freeze at 09:00. The building will not release you until it is clean.',
  seed: `
CREATE TABLE nodes (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  parent_id INTEGER REFERENCES nodes(id),
  kind      TEXT NOT NULL,
  sealed    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO nodes (id, name, parent_id, kind, sealed) VALUES
  (1,'Nexus',NULL,'root',0),
  (2,'Floor 9',1,'floor',0),
  (3,'Floor 8',1,'floor',0),
  (4,'Archive Wing',2,'wing',0),
  (5,'Server Wing',2,'wing',0),
  (6,'Atrium Wing',3,'wing',0),
  (7,'Cold Room',4,'room',1),
  (8,'Reading Room',4,'room',0),
  (9,'Rack A',5,'room',0),
  (10,'Rack B',5,'room',0),
  (11,'Rack C',5,'room',1),
  (12,'Lobby',6,'room',0),
  (13,'Shelf 1',8,'unit',0),
  (14,'Shelf 2',8,'unit',0),
  (15,'Cabinet 1',7,'unit',1),
  (16,'Node A1',9,'unit',0),
  (17,'Node A2',9,'unit',0),
  (18,'Node B1',10,'unit',0),
  (19,'Node C1',11,'unit',1),
  (20,'Box 1',13,'item',0),
  (21,'Box 2',13,'item',0),
  (22,'Box 3',14,'item',0),
  (23,'Drive 1',16,'item',0),
  (24,'Drive 2',16,'item',0),
  (25,'Drive 3',18,'item',0);

CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  handle     TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  role       TEXT NOT NULL,
  settings   TEXT NOT NULL
);
INSERT INTO users (id, handle, email, created_at, role, settings) VALUES
  (1,'a.reyes','a.reyes@nexus.example','2023-01-11','architect','{"theme":"dark","mfa":true,"quota_gb":500}'),
  (2,'j.okafor','j.okafor@nexus.example','2023-02-20','engineer','{"theme":"dark","mfa":true,"quota_gb":200}'),
  (3,'m.lindgren','m.lindgren@nexus.example','2023-04-02','engineer','{"theme":"light","mfa":false,"quota_gb":200}'),
  (4,'s.haruna','s.haruna@nexus.example','2023-06-15','analyst','{"theme":"dark","mfa":true,"quota_gb":50}'),
  (5,'d.moreau','d.moreau@nexus.example','2024-01-08','analyst','{"theme":"light","mfa":false,"quota_gb":50}'),
  (6,'k.petrov','k.petrov@nexus.example','2024-03-19','operator','{"theme":"dark","mfa":true,"quota_gb":20}'),
  (7,'r.suzuki','r.suzuki@nexus.example','2024-09-30','operator','{"theme":"dark","mfa":false,"quota_gb":20}'),
  (8,'v.almeida','v.almeida@nexus.example','2025-02-14','engineer','{"theme":"dark","mfa":true,"quota_gb":200}'),
  (9,'t.novak','t.novak@nexus.example','2025-08-01','analyst','{"theme":"light","mfa":true,"quota_gb":50}'),
  (10,'archivist','archivist@nexus.example','2019-12-31','architect','{"theme":"dark","mfa":true,"quota_gb":9999}');

CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  started_at TEXT NOT NULL,
  ended_at   TEXT,
  device     TEXT NOT NULL,
  ip         TEXT NOT NULL,
  bytes_out  INTEGER NOT NULL
);
INSERT INTO sessions (id, user_id, started_at, ended_at, device, ip, bytes_out) VALUES
  (1,1,'2026-06-01 08:02','2026-06-01 12:30','laptop','10.0.4.11',412000),
  (2,2,'2026-06-01 08:15','2026-06-01 17:02','laptop','10.0.4.19',980000),
  (3,3,'2026-06-01 08:55','2026-06-01 16:40','desktop','10.0.4.22',233000),
  (4,4,'2026-06-01 09:01','2026-06-01 13:00','laptop','10.0.4.31',120000),
  (5,6,'2026-06-01 21:00','2026-06-02 05:10','terminal','10.0.9.2',4100000),
  (6,10,'2026-06-01 23:47','2026-06-02 00:02','terminal','10.0.9.99',88000000),
  (7,2,'2026-06-02 08:10','2026-06-02 17:20','laptop','10.0.4.19',1010000),
  (8,5,'2026-06-02 09:30','2026-06-02 11:00','tablet','10.0.4.44',54000),
  (9,7,'2026-06-02 21:05','2026-06-03 05:00','terminal','10.0.9.3',3900000),
  (10,10,'2026-06-02 23:51','2026-06-02 23:59','terminal','203.0.113.7',91000000),
  (11,8,'2026-06-03 08:44',NULL,'laptop','10.0.4.51',77000),
  (12,9,'2026-06-03 09:12','2026-06-03 12:12','laptop','10.0.4.58',65000),
  (13,3,'2026-06-03 08:59','2026-06-03 17:30','desktop','10.0.4.22',241000),
  (14,10,'2026-06-03 23:58',NULL,'terminal','203.0.113.7',12000000);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  actor       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  node_id     INTEGER REFERENCES nodes(id),
  payload     TEXT NOT NULL
);
INSERT INTO events (id, occurred_at, actor, kind, node_id, payload) VALUES
  (1,'2026-06-01 08:03','a.reyes','read',8,'{"object":"box-1","bytes":4200}'),
  (2,'2026-06-01 08:20','j.okafor','deploy',9,'{"service":"indexer","version":"4.2.0","ok":true}'),
  (3,'2026-06-01 09:00','m.lindgren','query',10,'{"ms":19400,"rows":1200000,"plan":"SCAN metrics"}'),
  (4,'2026-06-01 09:00','s.haruna','query',10,'{"ms":18800,"rows":1200000,"plan":"SCAN metrics"}'),
  (5,'2026-06-01 09:01','d.moreau','query',10,'{"ms":21100,"rows":1200000,"plan":"SCAN metrics"}'),
  (6,'2026-06-01 12:31','a.reyes','logout',NULL,'{"clean":true}'),
  (7,'2026-06-01 21:04','k.petrov','maintenance',11,'{"task":"reseat","ok":false,"error":"sealed"}'),
  (8,'2026-06-01 23:48','archivist','export',7,'{"object":"cabinet-1","bytes":88000000,"dest":"unknown"}'),
  (9,'2026-06-02 00:01','archivist','delete',15,'{"object":"cabinet-1","cascade":true}'),
  (10,'2026-06-02 08:12','j.okafor','deploy',9,'{"service":"indexer","version":"4.2.1","ok":true}'),
  (11,'2026-06-02 09:31','d.moreau','query',10,'{"ms":20500,"rows":1200000,"plan":"SCAN metrics"}'),
  (12,'2026-06-02 23:52','archivist','export',4,'{"object":"archive-wing","bytes":91000000,"dest":"203.0.113.7"}'),
  (13,'2026-06-03 08:45','v.almeida','deploy',9,'{"service":"api","version":"9.0.0","ok":false}'),
  (14,'2026-06-03 09:13','t.novak','query',10,'{"ms":230,"rows":40,"plan":"SEARCH metrics USING INDEX"}'),
  (15,'2026-06-03 23:59','archivist','purge',1,'{"scope":"self","confirm":"yes"}');

CREATE TABLE metrics (
  id       INTEGER PRIMARY KEY,
  host     TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  cpu      REAL NOT NULL,
  mem_pct  REAL NOT NULL,
  io_wait  REAL NOT NULL
);
INSERT INTO metrics (id, host, taken_at, cpu, mem_pct, io_wait) VALUES
  (1,'rack-a1','2026-06-01 08:00',0.21,0.44,0.02),
  (2,'rack-a1','2026-06-01 09:00',0.97,0.91,0.44),
  (3,'rack-a1','2026-06-01 10:00',0.34,0.55,0.05),
  (4,'rack-a1','2026-06-01 11:00',0.29,0.52,0.03),
  (5,'rack-a2','2026-06-01 08:00',0.18,0.40,0.01),
  (6,'rack-a2','2026-06-01 09:00',0.95,0.88,0.41),
  (7,'rack-a2','2026-06-01 10:00',0.31,0.51,0.04),
  (8,'rack-a2','2026-06-01 11:00',0.27,0.49,0.02),
  (9,'rack-b1','2026-06-01 08:00',0.11,0.30,0.01),
  (10,'rack-b1','2026-06-01 09:00',0.88,0.79,0.38),
  (11,'rack-b1','2026-06-01 10:00',0.22,0.41,0.03),
  (12,'rack-b1','2026-06-01 11:00',0.19,0.38,0.02),
  (13,'rack-a1','2026-06-02 09:00',0.99,0.94,0.51),
  (14,'rack-a2','2026-06-02 09:00',0.96,0.90,0.47),
  (15,'rack-b1','2026-06-02 09:00',0.90,0.82,0.40),
  (16,'rack-a1','2026-06-03 09:00',0.24,0.46,0.02),
  (17,'rack-a2','2026-06-03 09:00',0.22,0.43,0.02),
  (18,'rack-b1','2026-06-03 09:00',0.15,0.33,0.01);

-- One wide, untyped, comma-stuffed table. Normalising it is the point.
CREATE TABLE raw_intake (
  id            INTEGER PRIMARY KEY,
  submitted_at  TEXT NOT NULL,
  requester     TEXT NOT NULL,
  requester_mail TEXT NOT NULL,
  dept          TEXT NOT NULL,
  asset_name    TEXT NOT NULL,
  asset_kind    TEXT NOT NULL,
  tags          TEXT NOT NULL,
  size_text     TEXT NOT NULL,
  approved      TEXT NOT NULL
);
INSERT INTO raw_intake (id, submitted_at, requester, requester_mail, dept, asset_name, asset_kind, tags, size_text, approved) VALUES
  (1,'2026-05-02','A. Reyes','a.reyes@nexus.example','Platform','core-dump-01','file','urgent,retain,legal','1200 MB','yes'),
  (2,'2026-05-02','A. Reyes','a.reyes@nexus.example','Platform','core-dump-02','file','retain','980 MB','yes'),
  (3,'2026-05-04','J. Okafor','j.okafor@nexus.example','Platform','index-snapshot','file','retain,legal','4400 MB','no'),
  (4,'2026-05-05','S. Haruna','s.haruna@nexus.example','Insight','q1-extract','dataset','urgent','75 MB','yes'),
  (5,'2026-05-09','S. Haruna','s.haruna@nexus.example','Insight','q2-extract','dataset','','88 MB','pending'),
  (6,'2026-05-11','K. Petrov','k.petrov@nexus.example','Operations','rack-c-logs','file','legal','15000 MB','no'),
  (7,'2026-05-14','D. Moreau','d.moreau@nexus.example','Insight','churn-model','model','urgent,retain','310 MB','yes'),
  (8,'2026-05-18','M. Lindgren','m.lindgren@nexus.example','Platform','api-traces','file','','2200 MB','yes'),
  (9,'2026-05-22','V. Almeida','v.almeida@nexus.example','Platform','build-cache','file','retain','7800 MB','pending'),
  (10,'2026-05-27','T. Novak','t.novak@nexus.example','Insight','q3-extract','dataset','urgent,legal','92 MB','yes');

CREATE TABLE documents (
  id      INTEGER PRIMARY KEY,
  title   TEXT NOT NULL,
  body    TEXT NOT NULL,
  author  TEXT NOT NULL,
  written_at TEXT NOT NULL,
  classification TEXT NOT NULL
);
INSERT INTO documents (id, title, body, author, written_at, classification) VALUES
  (1,'Floor 9 handover','The cold room key is held by the archivist alone. Do not reseal Cabinet 1.','a.reyes','2025-11-02','internal'),
  (2,'Index postmortem','At 09:00 every report scans metrics end to end. One index on (host, taken_at) removes the freeze.','j.okafor','2026-06-01','internal'),
  (3,'Intake policy','Every intake row must resolve to one requester and one department. Tags belong in their own table.','a.reyes','2025-06-30','internal'),
  (4,'Archivist note','If you are reading this, I have already exported the wing. Do not follow me.','archivist','2026-06-02','restricted'),
  (5,'Retention schedule','Legal holds retain for seven years. Everything else expires after ninety days.','m.lindgren','2026-01-15','public'),
  (6,'Rack C incident','Rack C was sealed after a coolant leak. Node C1 has not answered since.','k.petrov','2026-04-11','internal'),
  (7,'Onboarding','Welcome to Nexus. Multi-factor authentication is mandatory for every engineer.','s.haruna','2026-02-01','public');

CREATE TABLE role_grants (
  id       INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id),
  node_id  INTEGER NOT NULL REFERENCES nodes(id),
  grant_kind TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT
);
INSERT INTO role_grants (id, user_id, node_id, grant_kind, granted_at, expires_at) VALUES
  (1,1,2,'admin','2023-01-11',NULL),
  (2,2,5,'write','2023-02-20',NULL),
  (3,3,5,'write','2023-04-02','2026-05-31'),
  (4,4,8,'read','2023-06-15',NULL),
  (5,5,8,'read','2024-01-08','2026-06-30'),
  (6,6,5,'operate','2024-03-19',NULL),
  (7,7,5,'operate','2024-09-30',NULL),
  (8,8,9,'write','2025-02-14',NULL),
  (9,9,8,'read','2025-08-01',NULL),
  (10,10,1,'admin','2019-12-31',NULL),
  (11,10,7,'admin','2019-12-31',NULL),
  (12,2,9,'write','2026-01-05','2026-01-31');
`,
};
