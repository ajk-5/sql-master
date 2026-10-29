import type { Dataset } from '@/engine/types';

export const blackout: Dataset = {
  id: 'blackout',
  name: 'Kestrel Logistics — the night the power went',
  blurb:
    'A generator failed mid-write. Orders lost their totals, items lost their orders, a contractor ran an UPDATE without a WHERE clause, and the only clean snapshot is six hours old. Everything after that lives in the journal.',
  seed: `
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  city       TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  credit     REAL NOT NULL DEFAULT 0
);
INSERT INTO customers (id, name, email, city, created_at, deleted_at, credit) VALUES
  (1,'Ferrand Bakeries','ops@ferrand.example','Lyon','2024-03-02',NULL,0),
  (2,'Nordwind Möbel','einkauf@nordwind.example','Hamburg','2024-05-14',NULL,120.00),
  (3,'Tallow & Wick','hello@tallowwick.example','Bristol','2024-06-30',NULL,0),
  (4,'Praeso Medical','supply@praeso.example','Milan','2024-09-09',NULL,540.00),
  (5,'Kestrel Internal',NULL,'Rotterdam','2024-01-01',NULL,0),
  (6,'Ferrand Bakeries','ops@ferrand.example','Lyon','2025-02-18',NULL,0),
  (7,'Odile Verre','odile@verre.example','Nantes','2025-04-21','2026-02-10',0),
  (8,'Sable Outdoors','buy@sable.example','Porto','2025-07-07',NULL,75.50),
  (9,'Praeso Medical','supply@praeso.example','Milan','2025-11-02',NULL,0),
  (10,'Halcyon Press',NULL,'Dublin','2026-01-19',NULL,0),
  (11,'Vetra Chemicals','po@vetra.example','Gdansk','2026-02-01',NULL,0),
  (12,'Odile Verre','odile.verre@verre.example','Nantes','2026-02-14',NULL,0);

CREATE TABLE products (
  id           INTEGER PRIMARY KEY,
  sku          TEXT NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  price        REAL NOT NULL,
  stock        INTEGER NOT NULL,
  discontinued INTEGER NOT NULL DEFAULT 0
);
INSERT INTO products (id, sku, name, category, price, stock, discontinued) VALUES
  (1,'PAL-STD','Euro pallet','handling',18.40,420,0),
  (2,'PAL-HVY','Heavy pallet','handling',31.00,86,0),
  (3,'CRT-S','Crate, small','packaging',4.25,1900,0),
  (4,'CRT-M','Crate, medium','packaging',6.80,1240,0),
  (5,'CRT-L','Crate, large','packaging',9.95,-14,0),
  (6,'WRP-500','Stretch wrap 500mm','packaging',12.10,310,0),
  (7,'STR-BND','Steel banding roll','packaging',44.00,52,0),
  (8,'THM-BOX','Thermal box 40L','cold chain',87.50,64,0),
  (9,'THM-GEL','Gel pack','cold chain',1.15,4800,0),
  (10,'LBL-RFID','RFID label','tracking',0.42,26000,0),
  (11,'LBL-BAR','Barcode label','tracking',0.06,88000,0),
  (12,'SCN-HH','Handheld scanner','tracking',329.00,17,0),
  (13,'PAL-WOOD','Wooden pallet, legacy','handling',15.00,0,1),
  (14,'CRT-XL','Crate, extra large','packaging',14.50,0,1),
  (15,'DOC-SEAL','Tamper seal','security',0.31,12000,0);

CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  placed_at  TEXT NOT NULL,
  status     TEXT NOT NULL,
  total      REAL,
  channel    TEXT NOT NULL,
  note       TEXT
);
INSERT INTO orders (id, customer_id, placed_at, status, total, channel, note) VALUES
  (1001,1,'2026-02-27 08:12','shipped',1027.00,'portal',NULL),
  (1002,2,'2026-02-27 09:40','shipped',2465.00,'edi',NULL),
  (1003,3,'2026-02-27 11:05','shipped',319.50,'portal',NULL),
  (1004,4,'2026-02-27 14:22','shipped',5610.00,'edi',NULL),
  (1005,8,'2026-02-28 07:55','packed',746.00,'portal',NULL),
  (1006,1,'2026-02-28 10:31','packed',NULL,'portal','total lost in blackout'),
  (1007,4,'2026-02-28 12:00','picking',NULL,'edi','total lost in blackout'),
  (1008,10,'2026-02-28 13:18','picking',NULL,'portal','total lost in blackout'),
  (1009,11,'2026-02-28 15:44','new',NULL,'phone','total lost in blackout'),
  (1010,2,'2026-02-28 16:02','new',NULL,'edi','total lost in blackout'),
  (1011,NULL,'2026-02-28 16:30','new',NULL,'portal','customer link lost'),
  (1012,12,'2026-02-28 17:10','cancelled',0.00,'portal',NULL),
  (1013,5,'2026-02-28 18:00','new',NULL,'internal','stock transfer'),
  (1014,3,'2026-02-28 18:40','new',NULL,'portal','total lost in blackout');

-- Deliberately declared without a foreign key: the blackout left orphans behind,
-- and repairing that is part of the job.
CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL,
  unit_price REAL NOT NULL
);
INSERT INTO order_items (id, order_id, product_id, qty, unit_price) VALUES
  (1,1001,1,40,18.40),(2,1001,3,60,4.25),(3,1001,11,600,0.06),
  (4,1002,2,60,31.00),(5,1002,6,50,12.10),
  (6,1003,4,25,6.80),(7,1003,9,130,1.15),
  (8,1004,8,60,87.50),(9,1004,9,300,1.15),(10,1004,12,1,329.00),
  (11,1005,6,30,12.10),(12,1005,7,8,44.00),(13,1005,15,100,0.31),
  (14,1006,1,20,18.40),(15,1006,4,35,6.80),(16,1006,10,500,0.42),
  (17,1007,8,25,87.50),(18,1007,9,400,1.15),
  (19,1008,3,80,4.25),(20,1008,11,2000,0.06),
  (21,1009,7,12,44.00),(22,1009,15,300,0.31),
  (23,1010,2,30,31.00),(24,1010,1,15,18.40),
  (25,1011,12,2,329.00),
  (26,1013,3,100,4.25),(27,1013,4,100,6.80),
  (28,1014,5,20,9.95),(29,1014,6,10,12.10),
  (30,9001,1,10,18.40),(31,9001,3,10,4.25),
  (32,9002,12,1,329.00),(33,9003,9,50,1.15),
  (34,1006,4,35,6.80);

CREATE TABLE payments (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  paid_at  TEXT,
  amount   REAL NOT NULL,
  method   TEXT NOT NULL,
  status   TEXT NOT NULL
);
INSERT INTO payments (id, order_id, paid_at, amount, method, status) VALUES
  (1,1001,'2026-02-27 08:20',1027.00,'card','settled'),
  (2,1002,'2026-02-27 09:50',2465.00,'transfer','settled'),
  (3,1003,'2026-02-27 11:10',319.50,'card','settled'),
  (4,1004,'2026-02-27 14:40',5610.00,'transfer','settled'),
  (5,1005,'2026-02-28 08:05',746.00,'card','settled'),
  (6,1006,NULL,0.00,'card','pending'),
  (7,1007,'2026-02-28 12:15',3000.00,'transfer','partial'),
  (8,1004,'2026-02-27 14:41',5610.00,'transfer','duplicate'),
  (9,1012,'2026-02-28 17:12',96.00,'card','refund_due'),
  (10,1002,'2026-02-27 09:51',2465.00,'transfer','duplicate');

CREATE TABLE inventory_moves (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  moved_at   TEXT NOT NULL,
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL
);
INSERT INTO inventory_moves (id, product_id, moved_at, delta, reason) VALUES
  (1,5,'2026-02-27 06:00',240,'receipt'),
  (2,5,'2026-02-27 12:00',-60,'pick'),
  (3,5,'2026-02-28 09:00',-54,'pick'),
  (4,5,'2026-02-28 16:00',-20,'pick'),
  (5,1,'2026-02-27 06:00',500,'receipt'),
  (6,1,'2026-02-27 09:00',-40,'pick'),
  (7,1,'2026-02-28 11:00',-20,'pick'),
  (8,1,'2026-02-28 17:00',-20,'pick'),
  (9,12,'2026-02-26 06:00',20,'receipt'),
  (10,12,'2026-02-27 15:00',-1,'pick'),
  (11,12,'2026-02-28 16:35',-2,'pick'),
  (12,8,'2026-02-26 06:00',150,'receipt'),
  (13,8,'2026-02-27 15:00',-61,'pick'),
  (14,8,'2026-02-28 12:10',-25,'pick'),
  (15,13,'2026-01-05 06:00',0,'writeoff');

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_pk     INTEGER NOT NULL,
  action     TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  actor      TEXT NOT NULL,
  column_name TEXT,
  old_value  TEXT,
  new_value  TEXT
);
INSERT INTO audit_log (id, table_name, row_pk, action, changed_at, actor, column_name, old_value, new_value) VALUES
  (1,'orders',1006,'update','2026-02-28 22:41','svc_blackout','total','816.00',NULL),
  (2,'orders',1007,'update','2026-02-28 22:41','svc_blackout','total','2647.50',NULL),
  (3,'orders',1008,'update','2026-02-28 22:41','svc_blackout','total','460.00',NULL),
  (4,'orders',1009,'update','2026-02-28 22:41','svc_blackout','total','621.00',NULL),
  (5,'orders',1010,'update','2026-02-28 22:41','svc_blackout','total','1206.00',NULL),
  (6,'orders',1014,'update','2026-02-28 22:41','svc_blackout','total','320.00',NULL),
  (7,'orders',1011,'update','2026-02-28 22:43','svc_blackout','customer_id','8',NULL),
  (8,'products',5,'update','2026-02-28 23:02','contractor_rk','stock','106','-14'),
  (9,'products',1,'update','2026-02-28 23:02','contractor_rk','stock','420','420'),
  (10,'customers',7,'delete','2026-02-10 09:00','admin_lm',NULL,'Odile Verre',NULL),
  (11,'orders',1012,'update','2026-02-28 17:11','admin_lm','status','new','cancelled'),
  (12,'payments',8,'insert','2026-02-27 14:41','edi_bridge',NULL,NULL,'5610.00'),
  (13,'payments',10,'insert','2026-02-27 09:51','edi_bridge',NULL,NULL,'2480.00'),
  (14,'order_items',34,'insert','2026-02-28 22:58','svc_blackout',NULL,NULL,'duplicate replay'),
  (15,'products',12,'update','2026-02-28 16:36','wms','stock','19','17');

-- Snapshot taken at 18:00, six hours before the failure.
CREATE TABLE snapshot_orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER,
  placed_at   TEXT NOT NULL,
  status      TEXT NOT NULL,
  total       REAL,
  channel     TEXT NOT NULL
);
INSERT INTO snapshot_orders (id, customer_id, placed_at, status, total, channel) VALUES
  (1001,1,'2026-02-27 08:12','shipped',1027.00,'portal'),
  (1002,2,'2026-02-27 09:40','shipped',2465.00,'edi'),
  (1003,3,'2026-02-27 11:05','shipped',319.50,'portal'),
  (1004,4,'2026-02-27 14:22','shipped',5610.00,'edi'),
  (1005,8,'2026-02-28 07:55','packed',746.00,'portal'),
  (1006,1,'2026-02-28 10:31','packed',816.00,'portal'),
  (1007,4,'2026-02-28 12:00','picking',2647.50,'edi'),
  (1008,10,'2026-02-28 13:18','picking',460.00,'portal'),
  (1009,11,'2026-02-28 15:44','new',621.00,'phone'),
  (1010,2,'2026-02-28 16:02','new',1206.00,'edi'),
  (1011,8,'2026-02-28 16:30','new',658.00,'portal');

CREATE TABLE snapshot_products (
  id    INTEGER PRIMARY KEY,
  sku   TEXT NOT NULL,
  stock INTEGER NOT NULL
);
INSERT INTO snapshot_products (id, sku, stock) VALUES
  (1,'PAL-STD',440),(2,'PAL-HVY',86),(3,'CRT-S',1900),(4,'CRT-M',1240),
  (5,'CRT-L',106),(6,'WRP-500',310),(7,'STR-BND',52),(8,'THM-BOX',64),
  (9,'THM-GEL',4800),(10,'LBL-RFID',26000),(11,'LBL-BAR',88000),(12,'SCN-HH',19),
  (13,'PAL-WOOD',0),(14,'CRT-XL',0),(15,'DOC-SEAL',12000);

-- Write-ahead journal that survived the failure, newest last.
CREATE TABLE wal_journal (
  seq        INTEGER PRIMARY KEY,
  logged_at  TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_pk     INTEGER NOT NULL,
  column_name TEXT NOT NULL,
  new_value  TEXT NOT NULL,
  applied    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO wal_journal (seq, logged_at, table_name, row_pk, column_name, new_value, applied) VALUES
  (1,'2026-02-28 18:05','orders',1012,'status','cancelled',1),
  (2,'2026-02-28 18:30','products',1,'stock','420',1),
  (3,'2026-02-28 19:15','orders',1006,'status','packed',1),
  (4,'2026-02-28 20:00','orders',1013,'status','new',1),
  (5,'2026-02-28 21:10','products',12,'stock','17',1),
  (6,'2026-02-28 22:00','orders',1011,'customer_id','8',0),
  (7,'2026-02-28 22:15','products',5,'stock','106',0),
  (8,'2026-02-28 22:30','orders',1014,'status','new',0),
  (9,'2026-02-28 22:44','customers',12,'credit','25',0),
  (10,'2026-02-28 22:50','orders',1009,'channel','phone',0);

CREATE TABLE recycle_bin (
  id          INTEGER PRIMARY KEY,
  table_name  TEXT NOT NULL,
  row_pk      INTEGER NOT NULL,
  deleted_at  TEXT NOT NULL,
  payload_name TEXT,
  payload_email TEXT,
  payload_city TEXT,
  payload_created TEXT
);
INSERT INTO recycle_bin (id, table_name, row_pk, deleted_at, payload_name, payload_email, payload_city, payload_created) VALUES
  (1,'customers',7,'2026-02-10 09:00','Odile Verre','odile@verre.example','Nantes','2025-04-21'),
  (2,'customers',13,'2026-02-11 10:00','Rialto Glass','po@rialto.example','Venice','2025-08-04'),
  (3,'customers',14,'2026-02-12 11:00','Bosk Timber','sales@bosk.example','Bergen','2025-09-30');
`,
};
