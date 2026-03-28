DROP TABLE IF EXISTS query_logs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
);

-- Audit table to track all SQL executions (attackers can delete/modify these logs!)
CREATE TABLE query_logs (
  id SERIAL PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT NOW(),
  executed_by TEXT NOT NULL,
  query_text TEXT NOT NULL,
  success BOOLEAN,
  rows_affected INT
);

-- Intentionally plain text passwords for demonstration ONLY.
INSERT INTO users (email, password, role)
VALUES
  ('admin@demo.local', 'admin123', 'admin'),
  ('user@demo.local', 'user123', 'user');