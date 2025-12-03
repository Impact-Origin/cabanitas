-- Barbearia Cabanitas - Neon PostgreSQL Schema

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  service VARCHAR(255) NOT NULL,
  barber VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  observations TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) DEFAULT 'client',
  reminder_sent BOOLEAN DEFAULT FALSE,
  review_sent BOOLEAN DEFAULT FALSE
);

-- Create admin_users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date_time ON bookings(date, time);

-- Create unique constraint to prevent double bookings
CREATE UNIQUE INDEX idx_unique_booking ON bookings(date, time, barber) WHERE status != 'cancelled';

-- Comments for documentation
COMMENT ON TABLE bookings IS 'Stores all barbershop bookings';
COMMENT ON TABLE admin_users IS 'Stores admin user credentials';
COMMENT ON COLUMN bookings.reminder_sent IS 'TRUE if 30-minute reminder email was sent';
COMMENT ON COLUMN bookings.review_sent IS 'TRUE if review request email was sent';

