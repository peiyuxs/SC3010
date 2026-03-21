DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
);

-- Intentionally plain text passwords for demonstration ONLY.
INSERT INTO users (email, password, role)
VALUES
  ('admin@demo.local', 'admin123', 'admin'),
  ('user@demo.local', 'user123', 'user');