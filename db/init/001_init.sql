-- Optional: create a dedicated app user
-- CREATE USER cas_user WITH PASSWORD 'CASCaRAtempP@ss';

-- Grant access
GRANT ALL PRIVILEGES ON DATABASE cascara_db TO cas_user;

-- Connect to DB
\c cascara_db;

-- Create a sample table
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    message TEXT
);

-- Insert test data
INSERT INTO test_table (message)
VALUES ('Hello from Postgres');