import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Create .env.local first.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function seed() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
    );
  `);

  await client.query("TRUNCATE TABLE users RESTART IDENTITY;");

  await client.query(`
    INSERT INTO users (email, password, role)
    VALUES
      ('admin@demo.local', 'admin123', 'admin'),
      ('user@demo.local', 'user123', 'user');
  `);

  console.log("Seed complete. Inserted admin and user demo accounts.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
