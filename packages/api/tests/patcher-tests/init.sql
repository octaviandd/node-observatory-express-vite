-- Initialize the test database for patcher verification.
-- Creates tables needed by the stress routes.

CREATE TABLE IF NOT EXISTS stress_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  value TEXT
);
