import { defineAct } from './util';

const ORDERS_STATE = 'SELECT id, customer_id, status, total FROM orders ORDER BY id;';
const PRODUCTS_STATE = 'SELECT id, sku, price, stock FROM products ORDER BY id;';
const CUSTOMERS_STATE =
  'SELECT id, name, email, city, created_at, deleted_at, credit FROM customers ORDER BY id;';
const ITEMS_STATE = 'SELECT id, order_id, product_id, qty, unit_price FROM order_items ORDER BY id;';

export const act4 = defineAct('blackout', [
  {
    id: 57,
    title: 'Something New in the Table',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Kestrel Logistics lost power at 22:41 while the warehouse system was mid-write. You have been given write access to the live database, which should frighten you. Start with the safest thing anyone can do to a database: add a row that was not there before.',
    objective:
      'Insert a customer with id 15, name Adriatic Glassworks, email po@adriatic.example, city Trieste and created_at 2026-03-01. Leave every other column at its default.',
    concepts: ['insert'],
    check: CUSTOMERS_STATE,
    requireKeywords: ['INSERT'],
    solution: `INSERT INTO customers (id, name, email, city, created_at)
VALUES (15, 'Adriatic Glassworks', 'po@adriatic.example', 'Trieste', '2026-03-01');`,
    hints: [
      'Name the columns you are supplying, then supply values in the same order.',
      'Columns you leave out take their declared default, which for credit is 0.',
      "INSERT INTO customers (id, name, email, city, created_at) VALUES (15, 'Adriatic Glassworks', ...);",
    ],
    xp: 100,
    badge: 'first-write',
  },
  {
    id: 58,
    title: 'A Pallet of New Stock',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Three product lines arrived on the morning lorry and none of them exist in the catalogue. One statement, three rows. Sending three separate statements would work and would also take three times as many round trips.',
    objective:
      'Insert three products in a single INSERT statement. id 16, sku SCN-BT, name Bluetooth scanner, category tracking, price 219.00, stock 25. id 17, sku PAL-PLA, name Plastic pallet, category handling, price 24.90, stock 300. id 18, sku WRP-750, name Stretch wrap 750mm, category packaging, price 17.40, stock 180. All three are not discontinued.',
    concepts: ['insert'],
    check: PRODUCTS_STATE,
    requireKeywords: ['INSERT'],
    solution: `INSERT INTO products (id, sku, name, category, price, stock, discontinued)
VALUES
  (16, 'SCN-BT', 'Bluetooth scanner', 'tracking', 219.00, 25, 0),
  (17, 'PAL-PLA', 'Plastic pallet', 'handling', 24.90, 300, 0),
  (18, 'WRP-750', 'Stretch wrap 750mm', 'packaging', 17.40, 180, 0);`,
    hints: [
      'One VALUES clause can carry several parenthesised tuples, separated by commas.',
      'Every tuple must supply the same columns in the same order.',
      'INSERT INTO products (...) VALUES (16, ...), (17, ...), (18, ...);',
    ],
    xp: 105,
  },
  {
    id: 59,
    title: 'Back From the Bin',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Somebody built a recycle bin instead of a real backup, and then deleted three customers into it. Two of them are gone from the customers table entirely. You are not going to retype their details. You are going to read them out of the bin and insert them in one motion.',
    objective:
      'Restore every customer held in recycle_bin that is no longer present in the customers table, using the stored payload for name, email, city and created_at, and the stored row_pk as the id. Do not touch customers that already exist.',
    concepts: ['insert', 'subquery'],
    check: CUSTOMERS_STATE,
    requireKeywords: ['INSERT', 'SELECT'],
    solution: `INSERT INTO customers (id, name, email, city, created_at)
SELECT row_pk, payload_name, payload_email, payload_city, payload_created
FROM recycle_bin
WHERE table_name = 'customers'
  AND row_pk NOT IN (SELECT id FROM customers);`,
    hints: [
      'INSERT INTO ... SELECT takes its rows from a query instead of a VALUES list.',
      'The SELECT must produce columns in the same order as the column list.',
      'Exclude the ones already present with NOT IN (SELECT id FROM customers).',
    ],
    xp: 110,
  },
  {
    id: 60,
    title: 'One Row, One Change',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Order 1005 left the loading bay at dawn and nobody told the database. An UPDATE is the most dangerous statement in SQL, because the difference between fixing one row and destroying fourteen thousand is a clause you can forget to type.',
    objective: 'Set the status of order 1005 to shipped. Change nothing else.',
    concepts: ['update'],
    check: ORDERS_STATE,
    requireKeywords: ['UPDATE', 'WHERE'],
    solution: "UPDATE orders SET status = 'shipped' WHERE id = 1005;",
    hints: [
      'UPDATE table SET column = value WHERE condition.',
      'Write the WHERE clause before you write the SET clause, as a habit.',
      "UPDATE orders SET status = 'shipped' WHERE id = 1005;",
    ],
    xp: 115,
  },
  {
    id: 61,
    title: 'The Price Rise',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Packaging costs went up five per cent overnight. You are not setting a value, you are deriving one from what is already stored, which means the column can appear on both sides of the equals sign.',
    objective:
      'Raise the price of every packaging product that is not discontinued by 5 per cent, rounded to 2 decimal places. Leave discontinued products and every other category alone.',
    concepts: ['update', 'math-functions'],
    check: PRODUCTS_STATE,
    requireKeywords: ['UPDATE'],
    solution: `UPDATE products
SET price = ROUND(price * 1.05, 2)
WHERE category = 'packaging' AND discontinued = 0;`,
    hints: [
      'The right-hand side of SET can be any expression, including one that reads the column itself.',
      'ROUND(value, 2) keeps money to the cent.',
      "SET price = ROUND(price * 1.05, 2) WHERE category = 'packaging' AND discontinued = 0",
    ],
    xp: 120,
  },
  {
    id: 62,
    title: 'Totals From the Lines',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Eight orders lost their total when the power went. The line items survived, so the totals can be rebuilt from them. Be warned before you run it: one of these orders will come out wrong, because something was replayed into the items table twice. You will find it later. Rebuild the totals anyway, and note which figure looks too large.',
    objective:
      'For every order whose total is missing, set the total to the sum of qty multiplied by unit_price across its order_items, rounded to 2 decimal places. Leave orders that already have a total untouched.',
    concepts: ['update', 'correlated'],
    check: ORDERS_STATE,
    requireKeywords: ['UPDATE', 'SELECT'],
    solution: `UPDATE orders
SET total = (
  SELECT ROUND(SUM(i.qty * i.unit_price), 2)
  FROM order_items i
  WHERE i.order_id = orders.id
)
WHERE total IS NULL;`,
    hints: [
      'A correlated subquery on the right of SET is evaluated once per updated row.',
      'Inside the subquery, refer to the outer table by name to link the two.',
      'SET total = (SELECT ROUND(SUM(i.qty * i.unit_price), 2) FROM order_items i WHERE i.order_id = orders.id)',
    ],
    xp: 125,
    badge: 'rebuilder',
  },
  {
    id: 63,
    title: 'Charged Twice',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'The EDI bridge retried two payments during the outage and both went through. The customers have noticed. Delete is permanent here, so read the rows before you remove them.',
    objective: 'Delete every payment whose status is duplicate.',
    concepts: ['delete'],
    check: 'SELECT id, order_id, amount, method, status FROM payments ORDER BY id;',
    requireKeywords: ['DELETE'],
    solution: "DELETE FROM payments WHERE status = 'duplicate';",
    hints: [
      'DELETE FROM table WHERE condition. There is no column list.',
      'A DELETE with no WHERE clause empties the table.',
      "DELETE FROM payments WHERE status = 'duplicate';",
    ],
    xp: 130,
  },
  {
    id: 64,
    title: 'Items With No Order',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Four line items point at orders 9001, 9002 and 9003. Those orders do not exist and never did; they were half-written when the disk stopped answering. The order_items table has no foreign key, which is exactly why this was allowed to happen.',
    objective: 'Delete every row in order_items whose order_id does not exist in the orders table.',
    concepts: ['delete', 'subquery'],
    check: ITEMS_STATE,
    requireKeywords: ['DELETE', 'SELECT'],
    solution: 'DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);',
    hints: [
      'The WHERE clause of a DELETE can contain a subquery like any other.',
      'NOT IN against a list of valid ids finds the orphans.',
      'DELETE FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);',
    ],
    xp: 135,
    badge: 'orphan-hunter',
  },
  {
    id: 65,
    title: 'Insert Or Update',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'The stock feed sends you a row per product and does not know or care whether you have seen that product before. Handling this with a SELECT, then a branch, then an INSERT or an UPDATE is three round trips and a race condition. One statement does it properly.',
    objective:
      'Apply a delivery in one statement: product 12 now has stock 40, and product 19 does not exist yet and must be created with sku SCN-QR, name QR scanner, category tracking, price 149.00, stock 60 and discontinued 0. If a product id already exists, only its stock may change.',
    concepts: ['upsert', 'insert', 'merge'],
    check: PRODUCTS_STATE,
    requireKeywords: ['ON CONFLICT'],
    solution: `INSERT INTO products (id, sku, name, category, price, stock, discontinued)
VALUES
  (12, 'SCN-HH', 'Handheld scanner', 'tracking', 329.00, 40, 0),
  (19, 'SCN-QR', 'QR scanner', 'tracking', 149.00, 60, 0)
ON CONFLICT(id) DO UPDATE SET stock = excluded.stock;`,
    hints: [
      'SQLite writes an upsert as INSERT ... ON CONFLICT(column) DO UPDATE SET ...',
      'The pseudo-table excluded holds the row that the insert tried to add.',
      'MySQL spells the same idea ON DUPLICATE KEY UPDATE, and the SQL standard spells it MERGE. SQLite has neither name and only the ON CONFLICT form.',
    ],
    xp: 140,
  },
  {
    id: 66,
    title: 'All or Nothing',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'A stock transfer is two statements: take from one bin, add to another. If the power fails between them, the warehouse has invented or destroyed inventory. A transaction makes the pair indivisible, and this warehouse learned that the expensive way three days ago.',
    objective:
      'Inside a single transaction, move 50 units of stock from product 3 to product 4: subtract 50 from product 3 and add 50 to product 4. Commit it.',
    concepts: ['transactions'],
    check: PRODUCTS_STATE,
    requireKeywords: ['BEGIN', 'COMMIT'],
    solution: `BEGIN;
UPDATE products SET stock = stock - 50 WHERE id = 3;
UPDATE products SET stock = stock + 50 WHERE id = 4;
COMMIT;`,
    hints: [
      'BEGIN opens the transaction, COMMIT makes every change inside it permanent at once.',
      'Until COMMIT, nobody else can see the half-finished state.',
      'BEGIN; UPDATE ...; UPDATE ...; COMMIT;',
    ],
    xp: 145,
    badge: 'atomic',
  },
  {
    id: 67,
    title: 'Take It Back',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'You are about to raise every price in the catalogue by ten per cent, and only after running it do you remember that discontinued lines are quoted in old contracts and must not move. This is the single most valuable word in the language: ROLLBACK. Do the wrong thing, undo it, then do the right thing.',
    objective:
      'In one transaction, raise the price of every product by 10 per cent rounded to 2 decimals, then roll that transaction back. Then, in a second transaction, apply the same rise only to products that are not discontinued, and commit it.',
    concepts: ['transactions'],
    check: PRODUCTS_STATE,
    requireKeywords: ['ROLLBACK', 'COMMIT'],
    solution: `BEGIN;
UPDATE products SET price = ROUND(price * 1.10, 2);
ROLLBACK;

BEGIN;
UPDATE products SET price = ROUND(price * 1.10, 2) WHERE discontinued = 0;
COMMIT;`,
    hints: [
      'ROLLBACK discards every change made since BEGIN, as though the transaction never happened.',
      'After a ROLLBACK you are free to start a new transaction and try again.',
      'BEGIN; UPDATE ...; ROLLBACK; BEGIN; UPDATE ... WHERE discontinued = 0; COMMIT;',
    ],
    xp: 150,
    badge: 'undo',
  },
  {
    id: 68,
    title: 'A Bookmark Mid-Transaction',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Rolling back the whole transaction throws away good work along with bad. A savepoint is a bookmark you can return to without abandoning everything before it.',
    objective:
      'In one transaction, first move every order with status new to status picking. Set a savepoint. Then cancel order 1013. Roll back to the savepoint so the cancellation is undone, and commit the transaction so the status change survives.',
    concepts: ['savepoints', 'transactions'],
    check: ORDERS_STATE,
    requireKeywords: ['SAVEPOINT', 'ROLLBACK TO'],
    solution: `BEGIN;
UPDATE orders SET status = 'picking' WHERE status = 'new';
SAVEPOINT before_cancel;
UPDATE orders SET status = 'cancelled' WHERE id = 1013;
ROLLBACK TO before_cancel;
COMMIT;`,
    hints: [
      'SAVEPOINT name marks a point inside an open transaction.',
      'ROLLBACK TO name rewinds to that mark and leaves the transaction open.',
      'The final COMMIT keeps everything that happened before the savepoint.',
    ],
    xp: 155,
  },
  {
    id: 69,
    title: 'The Six Hour Old Truth',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'There is a snapshot of the orders table taken at 18:00, six hours before the failure. It is not current, but it is certainly correct, and for the orders it covers it is the fastest way back. This is a restore.',
    objective:
      'For every order whose total is missing and which appears in snapshot_orders, set the total to the value recorded in the snapshot. Orders absent from the snapshot must keep their missing total.',
    concepts: ['update', 'recovery', 'correlated'],
    check: ORDERS_STATE,
    requireKeywords: ['snapshot_orders'],
    solution: `UPDATE orders
SET total = (SELECT s.total FROM snapshot_orders s WHERE s.id = orders.id)
WHERE total IS NULL
  AND id IN (SELECT id FROM snapshot_orders);`,
    hints: [
      'Without the IN guard, orders missing from the snapshot would be set to NULL by the subquery.',
      'A restore only covers what the backup actually contains. Knowing the gap is half the job.',
      'WHERE total IS NULL AND id IN (SELECT id FROM snapshot_orders)',
    ],
    xp: 160,
    badge: 'restorer',
  },
  {
    id: 70,
    title: 'Replaying the Journal',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'The snapshot stops at 18:00. Everything after it lives in wal_journal, a write-ahead log of changes with a flag saying whether each one made it to disk. Five entries never landed. Replay the stock ones, then mark them applied so nobody replays them twice.',
    objective:
      'Apply every unapplied wal_journal entry that targets the stock column of the products table, setting each product stock to the logged new_value as an integer. Then set applied to 1 on exactly those journal entries.',
    concepts: ['recovery', 'update', 'correlated', 'cast'],
    check: `SELECT 'product' AS scope, id AS key_id, CAST(stock AS TEXT) AS value FROM products
UNION ALL
SELECT 'journal', seq, CAST(applied AS TEXT) FROM wal_journal
ORDER BY scope, key_id;`,
    requireKeywords: ['wal_journal'],
    solution: `UPDATE products
SET stock = (
  SELECT CAST(w.new_value AS INTEGER)
  FROM wal_journal w
  WHERE w.table_name = 'products' AND w.column_name = 'stock'
    AND w.applied = 0 AND w.row_pk = products.id
)
WHERE EXISTS (
  SELECT 1 FROM wal_journal w
  WHERE w.table_name = 'products' AND w.column_name = 'stock'
    AND w.applied = 0 AND w.row_pk = products.id
);

UPDATE wal_journal
SET applied = 1
WHERE table_name = 'products' AND column_name = 'stock' AND applied = 0;`,
    hints: [
      'The journal stores values as text, so CAST them back to the column type.',
      'The EXISTS guard stops the UPDATE from blanking products the journal says nothing about.',
      'Mark the entries applied only after the data change has been made.',
    ],
    xp: 165,
    badge: 'journal-keeper',
  },
  {
    id: 71,
    title: 'Recover to 22:41',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'The audit log shows a service account called svc_blackout writing nulls across the orders table at 22:41. Everything logged before that moment is trustworthy; everything after it is suspect. Point-in-time recovery means choosing that instant and replaying the journal only as far as it.',
    objective:
      'Replay every unapplied wal_journal entry logged strictly before 2026-02-28 22:41, and no later ones. That means setting the customer_id of the named order from the journal value, and setting the status of the named order from the journal value. Then mark exactly the replayed entries as applied.',
    concepts: ['recovery', 'update', 'cast'],
    check: `SELECT 'order' AS scope, id AS key_id, COALESCE(CAST(customer_id AS TEXT), 'null') || '/' || status AS value FROM orders
UNION ALL
SELECT 'journal', seq, CAST(applied AS TEXT) FROM wal_journal
ORDER BY scope, key_id;`,
    requireKeywords: ['wal_journal', 'logged_at'],
    solution: `UPDATE orders
SET customer_id = (
  SELECT CAST(w.new_value AS INTEGER) FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'customer_id'
    AND w.applied = 0 AND w.logged_at < '2026-02-28 22:41' AND w.row_pk = orders.id
)
WHERE EXISTS (
  SELECT 1 FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'customer_id'
    AND w.applied = 0 AND w.logged_at < '2026-02-28 22:41' AND w.row_pk = orders.id
);

UPDATE orders
SET status = (
  SELECT w.new_value FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'status'
    AND w.applied = 0 AND w.logged_at < '2026-02-28 22:41' AND w.row_pk = orders.id
)
WHERE EXISTS (
  SELECT 1 FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'status'
    AND w.applied = 0 AND w.logged_at < '2026-02-28 22:41' AND w.row_pk = orders.id
);

UPDATE wal_journal
SET applied = 1
WHERE applied = 0
  AND logged_at < '2026-02-28 22:41'
  AND table_name = 'orders'
  AND column_name IN ('customer_id', 'status');`,
    hints: [
      'A recovery point is just a timestamp used as a filter on the log.',
      'Entries at or after the corruption must stay unapplied, so the journal still records them.',
      "Filter every statement with logged_at < '2026-02-28 22:41'.",
    ],
    xp: 170,
  },
  {
    id: 72,
    title: 'Reading the Damage Backwards',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'A third route home. The audit log kept the old value of every column it overwrote, which means the log itself is a backup of exactly the things that were destroyed. Six order totals were nulled at 22:41 by svc_blackout, and every one of them is written down in the column labelled old_value.',
    objective:
      'Restore the total of every order that svc_blackout nulled, taking the figure from the old_value recorded in audit_log and storing it as a number. Touch no other order.',
    concepts: ['recovery', 'update', 'cast', 'correlated'],
    check: ORDERS_STATE,
    requireKeywords: ['audit_log'],
    solution: `UPDATE orders
SET total = (
  SELECT CAST(a.old_value AS REAL)
  FROM audit_log a
  WHERE a.table_name = 'orders' AND a.column_name = 'total'
    AND a.actor = 'svc_blackout' AND a.row_pk = orders.id
)
WHERE id IN (
  SELECT row_pk FROM audit_log
  WHERE table_name = 'orders' AND column_name = 'total' AND actor = 'svc_blackout'
);`,
    hints: [
      'An audit log that stores old values is a row-level backup you already own.',
      'CAST the stored text to REAL so the column keeps its numeric type.',
      'Restrict both the subquery and the WHERE clause to the offending actor.',
    ],
    xp: 175,
  },
  {
    id: 73,
    title: 'The Same Customer Twice',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Ferrand Bakeries is in this table twice. So is Praeso Medical. Both duplicates share an email address with their original, which is the only reliable thing about them. Keep the oldest record of each address and remove the rest, without touching customers who have no email at all.',
    objective:
      'Delete duplicate customers: for each email address that appears more than once, keep only the row with the lowest id. Customers whose email is NULL must all survive.',
    concepts: ['delete', 'group-by', 'subquery'],
    check: CUSTOMERS_STATE,
    requireKeywords: ['DELETE', 'MIN'],
    solution: `DELETE FROM customers
WHERE email IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM customers WHERE email IS NOT NULL GROUP BY email
  );`,
    hints: [
      'Group by the duplicated column and take MIN(id) to decide which row survives.',
      'Then delete everything that is not in that set of survivors.',
      'NULL emails must be excluded from both halves, because NOT IN never matches a NULL.',
    ],
    xp: 180,
    badge: 'deduplicator',
  },
  {
    id: 74,
    title: 'The Line That Was Replayed',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Here is the thing you noticed twelve cases ago. Order 1006 recomputes to more than the snapshot says it should, because a line item was written to disk, replayed, and written again. The two rows are identical in every column except the primary key. Remove the copy and the three sources of truth finally agree.',
    objective:
      'Delete duplicate order_items: where two or more rows share the same order_id, product_id, qty and unit_price, keep only the one with the lowest id.',
    concepts: ['delete', 'group-by', 'subquery'],
    check: ITEMS_STATE,
    requireKeywords: ['DELETE', 'GROUP BY'],
    solution: `DELETE FROM order_items
WHERE id NOT IN (
  SELECT MIN(id) FROM order_items
  GROUP BY order_id, product_id, qty, unit_price
);`,
    hints: [
      'Group by every column that defines what a duplicate means, but not by the id.',
      'MIN(id) inside each group names the row you are keeping.',
      'DELETE FROM order_items WHERE id NOT IN (SELECT MIN(id) FROM order_items GROUP BY ...);',
    ],
    xp: 185,
  },
  {
    id: 75,
    title: 'Deleted, But Not Gone',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Kestrel learned something on the night of the blackout: a row you can still read is worth ten rows you cannot. The customers table carries a deleted_at column for precisely this reason. Retire the dormant accounts without removing a single row, so that next month somebody can change their mind.',
    objective:
      'Mark as deleted, by stamping deleted_at with 2026-03-01 00:00, every customer that has never placed an order and is not already marked. Delete nothing.',
    concepts: ['update', 'subquery', 'is-null'],
    check: CUSTOMERS_STATE,
    requireKeywords: ['UPDATE'],
    forbidKeywords: ['DELETE'],
    solution: `UPDATE customers
SET deleted_at = '2026-03-01 00:00'
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);`,
    hints: [
      'A soft delete is an UPDATE that sets a timestamp, and a convention that readers filter on it.',
      'Order 1011 has a NULL customer_id, and NOT IN stops matching entirely if the list contains a NULL.',
      'Exclude NULLs from the subquery with WHERE customer_id IS NOT NULL.',
    ],
    xp: 190,
  },
  {
    id: 76,
    title: 'Stock From First Principles',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'One product shows a stock of minus fourteen, which is not a quantity, it is an accusation. The stock column is a cached total; inventory_moves is the ledger it was supposed to be derived from. When a cache and its source disagree, the source wins.',
    objective:
      'For every product that has at least one row in inventory_moves, set stock to the sum of its deltas. Products with no movements keep the stock they have.',
    concepts: ['update', 'correlated', 'aggregates'],
    check: PRODUCTS_STATE,
    requireKeywords: ['inventory_moves'],
    solution: `UPDATE products
SET stock = (
  SELECT SUM(m.delta) FROM inventory_moves m WHERE m.product_id = products.id
)
WHERE EXISTS (
  SELECT 1 FROM inventory_moves m WHERE m.product_id = products.id
);`,
    hints: [
      'Rebuild the cached value from the ledger with a correlated SUM.',
      'The EXISTS guard is what protects products the ledger never mentions.',
      'A derived column that drifts from its source is a bug waiting for an audit.',
    ],
    xp: 195,
  },
  {
    id: 77,
    title: 'The Reconciliation',
    kind: 'query',
    dataset: 'blackout',
    story:
      'Before you sign the incident report, you have to prove the books balance. One order does not. Somebody added a handheld scanner to a shipped order after the invoice went out, and the customer paid the old figure. Find it by comparing what the order says it is worth against what its lines actually come to.',
    objective:
      'For every order that has line items and a recorded total, compare the stored total against the sum of qty multiplied by unit_price. Return only the orders where they disagree, as order_id, stored_total, items_total and a column named difference holding items_total minus stored_total, all money rounded to 2 decimals. Order by order_id. Row order is graded.',
    concepts: ['group-by', 'having', 'inner-join'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT o.id AS order_id,
       ROUND(o.total, 2) AS stored_total,
       ROUND(SUM(i.qty * i.unit_price), 2) AS items_total,
       ROUND(SUM(i.qty * i.unit_price) - o.total, 2) AS difference
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.total IS NOT NULL
GROUP BY o.id, o.total
HAVING ROUND(SUM(i.qty * i.unit_price), 2) <> ROUND(o.total, 2)
ORDER BY o.id;`,
    hints: [
      'Aggregate the line items per order, then compare the aggregate to the stored column.',
      'The comparison is on an aggregate, so it belongs in HAVING, not WHERE.',
      'Round both sides before comparing, or floating point will find disagreements that are not real.',
    ],
    xp: 200,
  },
  {
    id: 78,
    title: 'The Runbook',
    kind: 'recovery',
    dataset: 'blackout',
    story:
      'It is 04:00 and the warehouse opens at six. You have every technique this act taught you and one shot at putting Kestrel back together. Remove what was written twice, rebuild what was erased, reconnect what was orphaned, and close the journal behind you. Nobody is going to check your work except the people loading lorries in two hours.',
    objective:
      'Perform the full recovery in one submission: delete duplicate order_items keeping the lowest id of each identical group; delete order_items whose order no longer exists; rebuild the total of every order that has no total from its remaining line items, rounded to 2 decimals; restore the customer_id of order 1011 from the unapplied wal_journal entry that names it; and finally mark every wal_journal entry that targets the orders table as applied.',
    concepts: ['recovery', 'delete', 'update', 'transactions', 'correlated', 'comments'],
    check: `SELECT o.id, o.customer_id, o.status, ROUND(o.total, 2) AS total,
       (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS line_count
FROM orders o
ORDER BY o.id;`,
    requireKeywords: ['DELETE', 'UPDATE', 'wal_journal'],
    solution: `BEGIN;

DELETE FROM order_items
WHERE id NOT IN (
  SELECT MIN(id) FROM order_items
  GROUP BY order_id, product_id, qty, unit_price
);

DELETE FROM order_items
WHERE order_id NOT IN (SELECT id FROM orders);

UPDATE orders
SET total = (
  SELECT ROUND(SUM(i.qty * i.unit_price), 2)
  FROM order_items i WHERE i.order_id = orders.id
)
WHERE total IS NULL;

UPDATE orders
SET customer_id = (
  SELECT CAST(w.new_value AS INTEGER) FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'customer_id'
    AND w.applied = 0 AND w.row_pk = orders.id
)
WHERE EXISTS (
  SELECT 1 FROM wal_journal w
  WHERE w.table_name = 'orders' AND w.column_name = 'customer_id'
    AND w.applied = 0 AND w.row_pk = orders.id
);

UPDATE wal_journal SET applied = 1 WHERE table_name = 'orders';

COMMIT;`,
    hints: [
      'Order matters: remove the duplicates before you rebuild totals from the lines.',
      'Wrap the whole runbook in BEGIN and COMMIT so a mistake halfway through costs nothing.',
      'Every step here is a case you have already solved. This one only asks you to sequence them.',
      'Comment each step with -- as you go. At four in the morning the next person reading this runbook may well be you.',
    ],
    xp: 250,
    badge: 'case-four-closed',
  },
]);
