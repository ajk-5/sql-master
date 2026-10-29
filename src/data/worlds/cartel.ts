import type { Dataset } from '@/engine/types';

export const cartel: Dataset = {
  id: 'cartel',
  name: 'Meridian Financial Crimes Unit',
  blurb:
    'Eleven shell companies, four hundred wires and one banker who has stopped answering the phone. The money moves in circles; your job is to find where the circle closes.',
  seed: `
CREATE TABLE holders (
  id         INTEGER PRIMARY KEY,
  full_name  TEXT NOT NULL,
  country    TEXT NOT NULL,
  risk_band  TEXT NOT NULL,
  onboarded  TEXT NOT NULL,
  pep        INTEGER NOT NULL DEFAULT 0,
  referred_by INTEGER REFERENCES holders(id)
);
INSERT INTO holders (id, full_name, country, risk_band, onboarded, pep, referred_by) VALUES
  (1,'Dario Salvatierra','PA','high','2019-02-11',1,NULL),
  (2,'Ingrid Halvorsen','NO','low','2018-06-04',0,NULL),
  (3,'Tomas Bregovic','RS','medium','2020-01-22',0,1),
  (4,'Amina Diallo','SN','medium','2021-03-30',0,2),
  (5,'Viktor Lasko','CY','high','2017-11-08',1,1),
  (6,'Chen Ruolan','SG','low','2022-05-19',0,2),
  (7,'Felipe Ortega','MX','high','2019-09-02',0,1),
  (8,'Marta Kohl','DE','low','2016-04-14',0,NULL),
  (9,'Yusra Haddad','AE','high','2021-08-25',1,5),
  (10,'Peter Nkosi','ZA','medium','2020-10-06',0,3),
  (11,'Elena Brambilla','IT','medium','2018-12-30',0,8),
  (12,'Oskar Lindberg','SE','low','2023-02-17',0,2);

CREATE TABLE companies (
  id            INTEGER PRIMARY KEY,
  legal_name    TEXT NOT NULL,
  jurisdiction  TEXT NOT NULL,
  incorporated  TEXT NOT NULL,
  director_id   INTEGER REFERENCES holders(id),
  parent_id     INTEGER REFERENCES companies(id),
  sector        TEXT NOT NULL,
  is_shell      INTEGER NOT NULL DEFAULT 0
);
INSERT INTO companies (id, legal_name, jurisdiction, incorporated, director_id, parent_id, sector, is_shell) VALUES
  (1,'Meridian Holdings SA','PA','2015-01-12',1,NULL,'holding',1),
  (2,'Kestrel Freight Ltd','CY','2016-03-08',5,1,'logistics',1),
  (3,'Orsini Marine BV','NL','2017-07-19',11,2,'shipping',0),
  (4,'Halvorsen Fisheries AS','NO','2012-05-03',2,NULL,'food',0),
  (5,'Bregovic Metals doo','RS','2018-09-21',3,2,'metals',0),
  (6,'Sahel Agro SARL','SN','2019-04-11',4,NULL,'agriculture',0),
  (7,'Lasko Trading Ltd','CY','2019-11-30',5,1,'trading',1),
  (8,'Delta Ridge LLC','US','2020-02-14',7,7,'consulting',1),
  (9,'Ruolan Capital Pte','SG','2020-08-08',6,NULL,'finance',0),
  (10,'Haddad Ventures FZE','AE','2021-01-25',9,1,'investment',1),
  (11,'Nkosi Logistics Pty','ZA','2021-06-17',10,2,'logistics',0),
  (12,'Brambilla Textiles Srl','IT','2013-10-02',11,NULL,'textiles',0),
  (13,'Northern Light AB','SE','2023-03-01',12,4,'energy',0),
  (14,'Ortega Import SA de CV','MX','2018-01-19',7,NULL,'import',0),
  (15,'Cygnet Nominees Ltd','VG','2016-06-06',NULL,1,'nominee',1);

CREATE TABLE accounts (
  id          INTEGER PRIMARY KEY,
  iban        TEXT NOT NULL UNIQUE,
  holder_id   INTEGER REFERENCES holders(id),
  company_id  INTEGER REFERENCES companies(id),
  currency    TEXT NOT NULL,
  opened_on   TEXT NOT NULL,
  closed_on   TEXT,
  balance     REAL NOT NULL
);
INSERT INTO accounts (id, iban, holder_id, company_id, currency, opened_on, closed_on, balance) VALUES
  (1,'PA11MERI0000001',1,1,'USD','2015-01-20',NULL,4820000.00),
  (2,'CY22KEST0000002',5,2,'EUR','2016-03-15',NULL,1930500.50),
  (3,'NL33ORSI0000003',11,3,'EUR','2017-08-01',NULL,412300.75),
  (4,'NO44HALV0000004',2,4,'NOK','2012-05-10',NULL,88400.00),
  (5,'RS55BREG0000005',3,5,'EUR','2018-10-01',NULL,251900.00),
  (6,'SN66SAHE0000006',4,6,'XOF','2019-04-20',NULL,32100.00),
  (7,'CY77LASK0000007',5,7,'EUR','2019-12-05',NULL,2740000.00),
  (8,'US88DELT0000008',7,8,'USD','2020-02-20','2026-01-31',0.00),
  (9,'SG99RUOL0000009',6,9,'SGD','2020-08-15',NULL,675000.00),
  (10,'AE10HADD0000010',9,10,'AED','2021-02-01',NULL,3110000.00),
  (11,'ZA11NKOS0000011',10,11,'ZAR','2021-07-01',NULL,144000.00),
  (12,'IT12BRAM0000012',11,12,'EUR','2013-10-20',NULL,96500.00),
  (13,'SE13NORT0000013',12,13,'SEK','2023-03-10',NULL,58000.00),
  (14,'MX14ORTE0000014',7,14,'MXN','2018-02-01',NULL,905000.00),
  (15,'VG15CYGN0000015',NULL,15,'USD','2016-06-20',NULL,7200000.00),
  (16,'DE16KOHL0000016',8,NULL,'EUR','2016-04-25',NULL,21000.00),
  (17,'PA17MERI0000017',1,1,'EUR','2019-05-05',NULL,1050000.00),
  (18,'CY18LASK0000018',5,7,'USD','2021-09-09',NULL,880000.00);

CREATE TABLE wires (
  id           INTEGER PRIMARY KEY,
  from_acct    INTEGER NOT NULL REFERENCES accounts(id),
  to_acct      INTEGER NOT NULL REFERENCES accounts(id),
  sent_at      TEXT NOT NULL,
  amount       REAL NOT NULL,
  currency     TEXT NOT NULL,
  reference    TEXT,
  flagged      INTEGER NOT NULL DEFAULT 0
);
INSERT INTO wires (id, from_acct, to_acct, sent_at, amount, currency, reference, flagged) VALUES
  (1,15,1,'2026-01-05 09:12',1500000,'USD','capital injection',0),
  (2,1,2,'2026-01-05 11:40',740000,'USD','freight prepayment',0),
  (3,2,3,'2026-01-06 08:22',310000,'EUR','charter hire',0),
  (4,3,5,'2026-01-06 15:01',95000,'EUR','scrap purchase',0),
  (5,5,7,'2026-01-07 10:05',94000,'EUR','settlement',1),
  (6,7,15,'2026-01-07 16:44',600000,'USD','loan repayment',1),
  (7,1,7,'2026-01-08 09:30',480000,'USD','intercompany',0),
  (8,7,10,'2026-01-08 13:15',470000,'USD','advisory fee',1),
  (9,10,15,'2026-01-09 07:50',465000,'USD','distribution',1),
  (10,15,1,'2026-01-09 18:20',460000,'USD','capital injection',1),
  (11,4,12,'2026-01-10 09:00',18000,'EUR','invoice 4411',0),
  (12,12,3,'2026-01-11 10:10',17500,'EUR','fabric shipment',0),
  (13,6,11,'2026-01-11 14:32',9000,'USD','haulage',0),
  (14,11,2,'2026-01-12 09:44',8800,'EUR','haulage',0),
  (15,9,16,'2026-01-12 12:00',45000,'EUR','consultancy',0),
  (16,14,8,'2026-01-13 08:15',220000,'USD','import settlement',1),
  (17,8,7,'2026-01-13 17:02',219000,'USD','commission',1),
  (18,7,14,'2026-01-14 09:41',215000,'USD','rebate',1),
  (19,1,17,'2026-01-15 11:11',900000,'EUR','treasury sweep',0),
  (20,17,2,'2026-01-15 15:55',880000,'EUR','freight prepayment',0),
  (21,2,7,'2026-01-16 10:30',870000,'EUR','settlement',1),
  (22,7,17,'2026-01-16 19:05',860000,'EUR','loan',1),
  (23,13,4,'2026-01-17 09:20',12000,'SEK','dividend',0),
  (24,4,13,'2026-01-18 09:20',11800,'SEK','dividend',0),
  (25,16,9,'2026-01-19 10:45',44000,'EUR','refund',0),
  (26,15,10,'2026-01-20 08:00',2000000,'USD','equity',0),
  (27,10,1,'2026-01-20 20:14',1980000,'USD','equity',1),
  (28,1,15,'2026-01-21 07:30',1960000,'USD','redemption',1),
  (29,5,3,'2026-01-22 11:00',49000,'EUR','scrap',0),
  (30,3,2,'2026-01-22 16:20',48000,'EUR','charter hire',0),
  (31,2,5,'2026-01-23 09:10',47000,'EUR','settlement',0),
  (32,18,10,'2026-01-24 10:00',780000,'USD','advisory fee',1),
  (33,10,18,'2026-01-25 10:00',770000,'USD','advisory fee',1),
  (34,6,6,'2026-01-26 09:00',500,'XOF','internal adjustment',0),
  (35,12,16,'2026-01-27 13:37',9900,'EUR','sample order',0),
  (36,16,12,'2026-01-28 13:37',9900,'EUR','sample order',0),
  (37,9,15,'2026-01-29 09:09',330000,'USD','placement',1),
  (38,15,7,'2026-01-30 09:09',325000,'USD','placement',1),
  (39,7,9,'2026-01-31 09:09',320000,'USD','placement',1),
  (40,11,6,'2026-02-01 08:40',8600,'USD','haulage',0);

CREATE TABLE transactions (
  id        INTEGER PRIMARY KEY,
  acct_id   INTEGER NOT NULL REFERENCES accounts(id),
  booked_at TEXT NOT NULL,
  amount    REAL NOT NULL,
  channel   TEXT NOT NULL,
  merchant  TEXT,
  city      TEXT
);
INSERT INTO transactions (id, acct_id, booked_at, amount, channel, merchant, city) VALUES
  (1,1,'2026-01-05 12:00',-9500,'card','Hotel Cortez','Panama City'),
  (2,1,'2026-01-06 12:00',-2400,'card','Aurelio Tailors','Panama City'),
  (3,7,'2026-01-06 19:00',-14200,'card','Larnaca Marina','Larnaca'),
  (4,7,'2026-01-07 19:00',-9800,'cash','ATM','Larnaca'),
  (5,7,'2026-01-08 19:00',-9800,'cash','ATM','Larnaca'),
  (6,7,'2026-01-09 19:00',-9800,'cash','ATM','Larnaca'),
  (7,7,'2026-01-10 19:00',-9800,'cash','ATM','Limassol'),
  (8,10,'2026-01-11 08:00',-58000,'card','Falcon Aviation','Dubai'),
  (9,10,'2026-01-12 08:00',-3200,'card','Al Wasl Souq','Dubai'),
  (10,4,'2026-01-12 09:00',-450,'card','Bergen Sjomat','Bergen'),
  (11,4,'2026-01-13 09:00',-380,'card','Bergen Sjomat','Bergen'),
  (12,14,'2026-01-14 17:00',-22000,'card','Polanco Motors','Mexico City'),
  (13,14,'2026-01-15 17:00',-9900,'cash','ATM','Mexico City'),
  (14,14,'2026-01-16 17:00',-9900,'cash','ATM','Mexico City'),
  (15,2,'2026-01-17 10:00',-125000,'wire','Kestrel Payroll','Nicosia'),
  (16,9,'2026-01-18 10:00',-4100,'card','Raffles','Singapore'),
  (17,16,'2026-01-19 10:00',-620,'card','Kohl Buchhandlung','Berlin'),
  (18,12,'2026-01-20 10:00',-1750,'card','Milano Tessuti','Milan'),
  (19,15,'2026-01-21 10:00',-250000,'wire','Cygnet Fees','Road Town'),
  (20,5,'2026-01-22 10:00',-3300,'card','Beograd Alat','Belgrade'),
  (21,7,'2026-01-23 19:00',-9800,'cash','ATM','Limassol'),
  (22,7,'2026-01-24 19:00',-9800,'cash','ATM','Limassol'),
  (23,11,'2026-01-25 08:00',-2100,'card','Jozi Fuel','Johannesburg'),
  (24,13,'2026-01-26 08:00',-780,'card','Norrsken El','Stockholm'),
  (25,6,'2026-01-27 08:00',-140,'card','Dakar Marche','Dakar');

CREATE TABLE watchlist (
  id        INTEGER PRIMARY KEY,
  subject   TEXT NOT NULL,
  kind      TEXT NOT NULL,
  added_on  TEXT NOT NULL,
  source    TEXT NOT NULL,
  severity  INTEGER NOT NULL
);
INSERT INTO watchlist (id, subject, kind, added_on, source, severity) VALUES
  (1,'Dario Salvatierra','person','2024-06-01','national',5),
  (2,'Viktor Lasko','person','2023-02-14','international',5),
  (3,'Yusra Haddad','person','2025-01-09','national',4),
  (4,'Cygnet Nominees Ltd','company','2022-11-30','international',5),
  (5,'Delta Ridge LLC','company','2025-07-22','national',3),
  (6,'Felipe Ortega','person','2026-01-02','tip-off',2),
  (7,'Meridian Holdings SA','company','2024-06-01','national',4),
  (8,'Lasko Trading Ltd','company','2023-02-14','international',4);

CREATE TABLE fx_rates (
  id       INTEGER PRIMARY KEY,
  currency TEXT NOT NULL,
  rate_usd REAL NOT NULL,
  as_of    TEXT NOT NULL
);
INSERT INTO fx_rates (id, currency, rate_usd, as_of) VALUES
  (1,'USD',1.0,'2026-02-01'),(2,'EUR',1.09,'2026-02-01'),(3,'NOK',0.094,'2026-02-01'),
  (4,'XOF',0.00166,'2026-02-01'),(5,'SGD',0.74,'2026-02-01'),(6,'AED',0.272,'2026-02-01'),
  (7,'ZAR',0.054,'2026-02-01'),(8,'SEK',0.096,'2026-02-01'),(9,'MXN',0.058,'2026-02-01');

CREATE TABLE alerts (
  id         INTEGER PRIMARY KEY,
  wire_id    INTEGER REFERENCES wires(id),
  rule_code  TEXT NOT NULL,
  raised_at  TEXT NOT NULL,
  analyst    TEXT,
  disposition TEXT
);
INSERT INTO alerts (id, wire_id, rule_code, raised_at, analyst, disposition) VALUES
  (1,5,'R-LOOP','2026-01-07 11:00','Ibarra',NULL),
  (2,6,'R-ROUND','2026-01-07 17:00','Ibarra','escalated'),
  (3,8,'R-FEE','2026-01-08 14:00','Nowak','closed'),
  (4,9,'R-LOOP','2026-01-09 08:30','Nowak',NULL),
  (5,10,'R-LOOP','2026-01-09 19:00','Ibarra','escalated'),
  (6,16,'R-TRADE','2026-01-13 09:00',NULL,NULL),
  (7,17,'R-FEE','2026-01-13 18:00','Ibarra',NULL),
  (8,21,'R-ROUND','2026-01-16 11:00','Nowak','escalated'),
  (9,27,'R-LOOP','2026-01-20 21:00',NULL,NULL),
  (10,28,'R-LOOP','2026-01-21 08:00','Ibarra','escalated'),
  (11,32,'R-FEE','2026-01-24 11:00',NULL,NULL),
  (12,37,'R-LAYER','2026-01-29 10:00','Nowak',NULL),
  (13,38,'R-LAYER','2026-01-30 10:00','Nowak',NULL),
  (14,39,'R-LAYER','2026-01-31 10:00',NULL,NULL);
`,
};
