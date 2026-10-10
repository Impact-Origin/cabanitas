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
  duration VARCHAR(10) DEFAULT '30min',
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  observations TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) DEFAULT 'client',
  reminder_sent BOOLEAN DEFAULT FALSE,
  review_sent BOOLEAN DEFAULT FALSE,
  manage_token VARCHAR(64)
);

-- Create admin_users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vacations table (férias)
CREATE TABLE vacations (
  id SERIAL PRIMARY KEY,
  barber VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notification_sent BOOLEAN DEFAULT FALSE
);

-- Create holidays table (feriados)
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL UNIQUE,
  is_working BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date_time ON bookings(date, time);
CREATE INDEX idx_bookings_barber ON bookings(barber);
CREATE UNIQUE INDEX idx_bookings_manage_token ON bookings(manage_token);
CREATE INDEX idx_vacations_barber ON vacations(barber);
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);
CREATE INDEX idx_holidays_date ON holidays(date);

-- Note: Removed unique constraint to allow double bookings (2 people per time slot)
-- Each booking occupies 1 hour (current slot + next 30min slot)

-- Comments for documentation
COMMENT ON TABLE bookings IS 'Stores all barbershop bookings';
COMMENT ON TABLE admin_users IS 'Stores admin user credentials';
COMMENT ON TABLE vacations IS 'Stores barber vacation periods';
COMMENT ON TABLE holidays IS 'Stores holidays and whether barbershop works on them';
COMMENT ON COLUMN bookings.reminder_sent IS 'TRUE if 30-minute reminder email was sent';
COMMENT ON COLUMN bookings.review_sent IS 'TRUE if review request email was sent';
COMMENT ON COLUMN bookings.manage_token IS 'Secret token so the client can reschedule/cancel from the email link';
COMMENT ON COLUMN vacations.notification_sent IS 'TRUE if clients were notified about vacation';

