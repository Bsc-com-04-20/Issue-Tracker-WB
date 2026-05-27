-- Zomba mock operational data (run against your own DB after creating compatible tables).
-- Customer rows align with zomba_customer.csv; meter keys align with zomba_meter.csv and
-- waterboard-issue-system/seed/meter-registry.merge.json for Nest METER_REGISTRY_MERGE_PATH.

CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(32) PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  district VARCHAR(80) NOT NULL,
  area VARCHAR(120) NOT NULL,
  address_description VARCHAR(512) NOT NULL,
  meter_number VARCHAR(64) NOT NULL,
  account_status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers
(customer_id, full_name, phone_number, district, area, address_description, meter_number, account_status)
VALUES
('ZB-NACHUM-01','John Banda','+265991000001','Zomba','NACHUMA','Mock address in NACHUMA','37224210001','active'),
('ZB-NACHUM-02','Grace Phiri','+265991000002','Zomba','NACHUMA','Mock address in NACHUMA','37224210002','active'),
('ZB-NACHUM-03','Peter Mbewe','+265991000003','Zomba','NACHUMA','Mock address in NACHUMA','37224210003','active'),
('ZB-NACHUM-04','Mary Chirwa','+265991000004','Zomba','NACHUMA','Mock address in NACHUMA','37224210004','active'),
('ZB-NACHUM-05','James Moyo','+265991000005','Zomba','NACHUMA','Mock address in NACHUMA','37224210005','active')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone_number = VALUES(phone_number),
  district = VALUES(district),
  area = VALUES(area),
  address_description = VALUES(address_description),
  meter_number = VALUES(meter_number),
  account_status = VALUES(account_status);
