import { NextRequest, NextResponse } from "next/server";
import { holidayDb } from "@/lib/db";

// GET - Get all holidays
export async function GET(req: NextRequest) {
  try {
    const holidays = await holidayDb.getAll();
    console.log("📅 Raw holidays from DB:", holidays);
    console.log("📅 Sample raw date:", holidays[0]?.date, "type:", typeof holidays[0]?.date);
    
    // Normalize dates to YYYY-MM-DD format before sending to client
    const normalizedHolidays = holidays.map(h => {
      try {
        let dateStr: string;
        
        // Handle different date formats from database
        if (!h.date) {
          dateStr = '';
        } else if (typeof h.date === 'string') {
          dateStr = h.date;
        } else if (h.date instanceof Date) {
          // If it's a Date object, format it as YYYY-MM-DD (use local timezone)
          const year = h.date.getFullYear();
          const month = String(h.date.getMonth() + 1).padStart(2, '0');
          const day = String(h.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          // Try to convert to string first
          dateStr = String(h.date);
        }
        
        // Now normalize the string to YYYY-MM-DD format
        const normalizedDate = dateStr ? holidayDb.normalizeDate(dateStr) : '';
        
        return {
          ...h,
          date: normalizedDate || dateStr
        };
      } catch (err) {
        console.error("❌ Error normalizing holiday date:", h, err);
        return {
          ...h,
          date: h.date ? String(h.date) : ''
        };
      }
    });
    
    console.log("📅 API returning normalized holidays:", normalizedHolidays.slice(0, 3));
    return NextResponse.json({ holidays: normalizedHolidays }, { status: 200 });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { message: "Error fetching holidays", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST - Create or update holiday
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, date, is_working } = body;

    if (!name || !date) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // If ID is provided, update existing holiday by ID (more reliable)
    // Only update is_working, don't change date to avoid timezone issues
    if (id) {
      const existing = await holidayDb.getById(id);
      if (existing) {
        await holidayDb.update(id, {
          name: name || existing.name, // Keep existing name if not provided
          is_working: is_working ?? false,
        });
        return NextResponse.json(
          { message: "Holiday updated successfully", holidayId: id },
          { status: 200 }
        );
      }
    }

    // Otherwise, use upsert (create or update by date)
    const holidayId = await holidayDb.upsert({
      name,
      date,
      is_working: is_working ?? false,
    });

    return NextResponse.json(
      { message: "Holiday saved successfully", holidayId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving holiday:", error);
    return NextResponse.json(
      { message: "Error saving holiday", error },
      { status: 500 }
    );
  }
}

// DELETE - Delete holiday
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Missing holiday ID" },
        { status: 400 }
      );
    }

    await holidayDb.delete(Number(id));

    return NextResponse.json(
      { message: "Holiday deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { message: "Error deleting holiday", error },
      { status: 500 }
    );
  }
}



