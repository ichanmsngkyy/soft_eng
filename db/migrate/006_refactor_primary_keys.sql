-- Refactor parts table: make categoryId the primary key
ALTER TABLE parts DROP PRIMARY KEY;
ALTER TABLE parts DROP COLUMN id;
ALTER TABLE parts MODIFY categoryId VARCHAR(50) NOT NULL;
ALTER TABLE parts ADD PRIMARY KEY (categoryId);

-- Refactor orders table: make orderId the primary key, reference categoryId
ALTER TABLE orders DROP PRIMARY KEY;
ALTER TABLE orders DROP COLUMN id;
ALTER TABLE orders MODIFY orderId VARCHAR(50) NOT NULL;
ALTER TABLE orders ADD PRIMARY KEY (orderId);
ALTER TABLE orders MODIFY categoryId VARCHAR(50);
-- Remove old foreign key if exists, then add new one
ALTER TABLE orders DROP FOREIGN KEY IF EXISTS fk_orders_parts;
ALTER TABLE orders ADD CONSTRAINT fk_orders_parts FOREIGN KEY (categoryId) REFERENCES parts(categoryId);

-- Refactor activity_logs table: make activityId the primary key, reference categoryId
ALTER TABLE activity_logs DROP PRIMARY KEY;
ALTER TABLE activity_logs DROP COLUMN id;
ALTER TABLE activity_logs ADD COLUMN activityId VARCHAR(50) NOT NULL PRIMARY KEY FIRST;
ALTER TABLE activity_logs MODIFY categoryId VARCHAR(50);
-- Remove old foreign key if exists, then add new one
ALTER TABLE activity_logs DROP FOREIGN KEY IF EXISTS fk_activitylogs_parts;
ALTER TABLE activity_logs ADD CONSTRAINT fk_activitylogs_parts FOREIGN KEY (categoryId) REFERENCES parts(categoryId); 