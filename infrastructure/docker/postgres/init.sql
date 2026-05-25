-- Manara OS — PostgreSQL Initialization
-- Runs once when the container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Grant privileges to the manara user
GRANT ALL PRIVILEGES ON DATABASE manara_os TO manara;
