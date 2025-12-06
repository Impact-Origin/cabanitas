import { neon } from "@neondatabase/serverless";

// Initialize Neon connection
const sql = neon(process.env.DATABASE_URL!);

// Types
export interface Booking {
  id?: number;
  service: string;
  barber: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string | null;
  observations?: string | null;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  created_at?: string;
  created_by?: "client" | "admin";
  reminder_sent?: boolean;
  review_sent?: boolean;
}

export interface AdminUser {
  id?: number;
  username: string;
  password: string;
  created_at?: string;
}

export interface Vacation {
  id?: number;
  barber: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  notification_sent?: boolean;
}

export interface Holiday {
  id?: number;
  name: string;
  date: string;
  is_working: boolean;
  created_at?: string;
}

// Database functions
export const bookingDb = {
  // Create booking
  create: async (booking: Booking): Promise<number> => {
    const result = await sql`
      INSERT INTO bookings (service, barber, date, time, name, phone, email, observations, created_by, status)
      VALUES (
        ${booking.service},
        ${booking.barber},
        ${booking.date},
        ${booking.time},
        ${booking.name},
        ${booking.phone},
        ${booking.email || null},
        ${booking.observations || null},
        ${booking.created_by || "client"},
        ${booking.status || "confirmed"}
      )
      RETURNING id
    `;
    return result[0].id;
  },

  // Get all bookings
  getAll: async (): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      ORDER BY date DESC, time DESC
    `;
    return result as Booking[];
  },

  // Get bookings by date
  getByDate: async (date: string): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE date = ${date}
      ORDER BY time
    `;
    return result as Booking[];
  },

  // Get bookings by date range
  getByDateRange: async (startDate: string, endDate: string): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE date BETWEEN ${startDate} AND ${endDate}
      ORDER BY date, time
    `;
    return result as Booking[];
  },

  // Get booking by id
  getById: async (id: number): Promise<Booking | undefined> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE id = ${id}
    `;
    return result[0] as Booking | undefined;
  },

  // Update booking
  update: async (id: number, booking: Partial<Booking>): Promise<void> => {
    const updates: string[] = [];
    const values: any[] = [];

    if (booking.service !== undefined) {
      updates.push(`service = $${updates.length + 1}`);
      values.push(booking.service);
    }
    if (booking.barber !== undefined) {
      updates.push(`barber = $${updates.length + 1}`);
      values.push(booking.barber);
    }
    if (booking.date !== undefined) {
      updates.push(`date = $${updates.length + 1}`);
      values.push(booking.date);
    }
    if (booking.time !== undefined) {
      updates.push(`time = $${updates.length + 1}`);
      values.push(booking.time);
    }
    if (booking.name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(booking.name);
    }
    if (booking.phone !== undefined) {
      updates.push(`phone = $${updates.length + 1}`);
      values.push(booking.phone);
    }
    if (booking.email !== undefined) {
      updates.push(`email = $${updates.length + 1}`);
      values.push(booking.email);
    }
    if (booking.observations !== undefined) {
      updates.push(`observations = $${updates.length + 1}`);
      values.push(booking.observations);
    }
    if (booking.status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(booking.status);
    }
    if (booking.reminder_sent !== undefined) {
      updates.push(`reminder_sent = $${updates.length + 1}`);
      values.push(booking.reminder_sent);
    }
    if (booking.review_sent !== undefined) {
      updates.push(`review_sent = $${updates.length + 1}`);
      values.push(booking.review_sent);
    }

    if (updates.length === 0) return;

    const query = `UPDATE bookings SET ${updates.join(", ")} WHERE id = $${updates.length + 1}`;
    values.push(id);

    // Use raw query for dynamic updates
    await sql.unsafe(query, values);
  },

  // Delete booking
  delete: async (id: number): Promise<void> => {
    await sql`
      DELETE FROM bookings 
      WHERE id = ${id}
    `;
  },

  // Check if time slot is available
  isTimeSlotAvailable: async (
    date: string,
    time: string,
    barber: string,
    excludeId?: number
  ): Promise<boolean> => {
    // Check if barber is on vacation
    const vacationCheck = await sql`
      SELECT COUNT(*) as count 
      FROM vacations 
      WHERE barber = ${barber}
      AND ${date} BETWEEN start_date AND end_date
    `;
    if (Number(vacationCheck[0].count) > 0) {
      return false;
    }

    // Check if it's a holiday and barbershop is closed
    const holidayCheck = await sql`
      SELECT COUNT(*) as count 
      FROM holidays 
      WHERE date = ${date}
      AND is_working = FALSE
    `;
    if (Number(holidayCheck[0].count) > 0) {
      return false;
    }

    // Check if slot is already booked
    let result;
    if (excludeId) {
      result = await sql`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE date = ${date} 
        AND time = ${time}
        AND barber = ${barber}
        AND id != ${excludeId}
        AND status != 'cancelled'
      `;
    } else {
      result = await sql`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE date = ${date} 
        AND time = ${time}
        AND barber = ${barber}
        AND status != 'cancelled'
      `;
    }
    return Number(result[0].count) === 0;
  },

  // Get bookings by barber
  getByBarber: async (barber: string): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE barber = ${barber}
      ORDER BY date DESC, time DESC
    `;
    return result as Booking[];
  },

  // Get unique clients (by email or phone)
  getUniqueClients: async (barber?: string): Promise<any[]> => {
    let result;
    if (barber && barber !== "all") {
      result = await sql`
        SELECT DISTINCT ON (COALESCE(email, phone))
          name,
          email,
          phone,
          barber,
          MAX(date) as last_booking_date,
          COUNT(*) as total_bookings
        FROM bookings
        WHERE barber = ${barber}
        AND status != 'cancelled'
        GROUP BY name, email, phone, barber
        ORDER BY COALESCE(email, phone), MAX(date) DESC
      `;
    } else {
      result = await sql`
        SELECT DISTINCT ON (COALESCE(email, phone))
          name,
          email,
          phone,
          barber,
          MAX(date) as last_booking_date,
          COUNT(*) as total_bookings
        FROM bookings
        WHERE status != 'cancelled'
        GROUP BY name, email, phone, barber
        ORDER BY COALESCE(email, phone), MAX(date) DESC
      `;
    }
    return result;
  },

  // Get bookings that need reminders (30 minutes before)
  getBookingsNeedingReminders: async (): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE status = 'confirmed' 
      AND reminder_sent = FALSE 
      AND (date || ' ' || time)::timestamp <= NOW() + INTERVAL '30 minutes'
      AND (date || ' ' || time)::timestamp > NOW()
    `;
    return result as Booking[];
  },

  // Get bookings that need review requests (1 hour after)
  getBookingsNeedingReviews: async (): Promise<Booking[]> => {
    const result = await sql`
      SELECT * FROM bookings 
      WHERE status = 'completed' 
      AND review_sent = FALSE 
      AND (date || ' ' || time)::timestamp <= NOW() - INTERVAL '1 hour'
    `;
    return result as Booking[];
  },

  // Mark reminder as sent
  markReminderSent: async (id: number): Promise<void> => {
    await sql`
      UPDATE bookings 
      SET reminder_sent = TRUE 
      WHERE id = ${id}
    `;
  },

  // Mark review as sent
  markReviewSent: async (id: number): Promise<void> => {
    await sql`
      UPDATE bookings 
      SET review_sent = TRUE 
      WHERE id = ${id}
    `;
  },
};

export const adminDb = {
  // Create admin user
  create: async (username: string, hashedPassword: string): Promise<void> => {
    await sql`
      INSERT INTO admin_users (username, password) 
      VALUES (${username}, ${hashedPassword})
    `;
  },

  // Get admin by username
  getByUsername: async (username: string): Promise<AdminUser | undefined> => {
    const result = await sql`
      SELECT * FROM admin_users 
      WHERE username = ${username}
    `;
    return result[0] as AdminUser | undefined;
  },
};

export const vacationDb = {
  // Create vacation
  create: async (vacation: Vacation): Promise<number> => {
    const result = await sql`
      INSERT INTO vacations (barber, start_date, end_date)
      VALUES (${vacation.barber}, ${vacation.start_date}, ${vacation.end_date})
      RETURNING id
    `;
    return result[0].id;
  },

  // Get all vacations
  getAll: async (): Promise<Vacation[]> => {
    const result = await sql`
      SELECT * FROM vacations 
      ORDER BY start_date DESC
    `;
    return result as Vacation[];
  },

  // Get vacations by barber
  getByBarber: async (barber: string): Promise<Vacation[]> => {
    const result = await sql`
      SELECT * FROM vacations 
      WHERE barber = ${barber}
      ORDER BY start_date DESC
    `;
    return result as Vacation[];
  },

  // Get vacations for a date range
  getByDateRange: async (startDate: string, endDate: string): Promise<Vacation[]> => {
    const result = await sql`
      SELECT * FROM vacations 
      WHERE (start_date <= ${endDate} AND end_date >= ${startDate})
      ORDER BY start_date
    `;
    return result as Vacation[];
  },

  // Delete vacation
  delete: async (id: number): Promise<void> => {
    await sql`
      DELETE FROM vacations 
      WHERE id = ${id}
    `;
  },

  // Mark notification as sent
  markNotificationSent: async (id: number): Promise<void> => {
    await sql`
      UPDATE vacations 
      SET notification_sent = TRUE 
      WHERE id = ${id}
    `;
  },
};

export const holidayDb = {
  // Get all holidays
  getAll: async (): Promise<Holiday[]> => {
    const result = await sql`
      SELECT * FROM holidays 
      ORDER BY date
    `;
    return result as Holiday[];
  },

  // Normalize date to YYYY-MM-DD format (NEVER use Date parsing to avoid timezone issues)
  normalizeDate: (date: string | null | undefined): string => {
    // Handle null/undefined
    if (!date) {
      console.warn("normalizeDate called with null/undefined");
      return '';
    }
    
    // Convert to string if needed
    const dateStr = String(date);
    
    // If date is already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // If date has timezone info (ISO format), extract just the date part
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    
    // If date is in JavaScript Date string format (e.g., "Wed Jan 01 2025 00:00:00 GMT...")
    // Extract the date parts: "Wed Jan 01 2025" -> "2025-01-01"
    const dateStringMatch = dateStr.match(/(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})/);
    if (dateStringMatch) {
      const monthNames: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthNames[dateStringMatch[2]] || '01';
      const day = dateStringMatch[3].padStart(2, '0');
      const year = dateStringMatch[4];
      return `${year}-${month}-${day}`;
    }
    
    // If date has space (SQL format), extract just the date part
    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      // Try to find YYYY-MM-DD pattern in the parts
      for (const part of parts) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
          return part;
        }
      }
      // If no YYYY-MM-DD found, try to parse the first part
      return parts[0];
    }
    
    // If it's a valid date string in YYYY-MM-DD format but with extra characters, extract it
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
    
    // Last resort: try to parse as Date and format (only if all else fails)
    try {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Ignore
    }
    
    // Last resort: return as is (shouldn't happen with proper data)
    console.warn("Could not normalize date:", dateStr);
    return dateStr;
  },

  // Get holiday by ID
  getById: async (id: number): Promise<Holiday | undefined> => {
    const result = await sql`
      SELECT * FROM holidays 
      WHERE id = ${id}
    `;
    return result[0] as Holiday | undefined;
  },

  // Get holiday by date
  getByDate: async (date: string): Promise<Holiday | undefined> => {
    const normalizedDate = holidayDb.normalizeDate(date);
    const result = await sql`
      SELECT * FROM holidays 
      WHERE date = ${normalizedDate}
    `;
    return result[0] as Holiday | undefined;
  },

  // Update holiday by ID (only update is_working, don't change date or name)
  update: async (id: number, holiday: Partial<Holiday>): Promise<void> => {
    // Only update is_working to avoid accidentally changing the date
    // If date needs to change, it should be a new holiday
    await sql`
      UPDATE holidays 
      SET is_working = ${holiday.is_working ?? false}
      WHERE id = ${id}
    `;
    
    // Optionally update name if provided (but keep date unchanged)
    if (holiday.name) {
      await sql`
        UPDATE holidays 
        SET name = ${holiday.name}
        WHERE id = ${id}
      `;
    }
  },

  // Create or update holiday
  upsert: async (holiday: Holiday): Promise<number> => {
    // Normalize the date to ensure consistent format
    const normalizedDate = holidayDb.normalizeDate(holiday.date);
    
    // First try to find existing holiday
    const existing = await holidayDb.getByDate(normalizedDate);
    
    if (existing) {
      // Update existing
      await sql`
        UPDATE holidays 
        SET name = ${holiday.name}, is_working = ${holiday.is_working}
        WHERE date = ${normalizedDate}
      `;
      return existing.id!;
    } else {
      // Insert new
      const result = await sql`
        INSERT INTO holidays (name, date, is_working)
        VALUES (${holiday.name}, ${normalizedDate}, ${holiday.is_working})
        RETURNING id
      `;
      return result[0].id;
    }
  },

  // Delete holiday
  delete: async (id: number): Promise<void> => {
    await sql`
      DELETE FROM holidays 
      WHERE id = ${id}
    `;
  },
};

// Initialize database (create tables if they don't exist)
export async function initializeDatabase() {
  try {
    // Check if tables exist
    const tablesExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookings'
      );
    `;

    if (!tablesExist[0].exists) {
      console.log("Creating database tables...");
      
      // Create bookings table
      await sql`
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
        )
      `;

      // Create admin_users table
      await sql`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create indexes
      await sql`CREATE INDEX idx_bookings_date ON bookings(date)`;
      await sql`CREATE INDEX idx_bookings_status ON bookings(status)`;
      await sql`CREATE INDEX idx_bookings_date_time ON bookings(date, time)`;

      console.log("✅ Database tables created successfully!");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
