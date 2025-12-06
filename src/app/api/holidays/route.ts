import { NextRequest, NextResponse } from "next/server";
import { holidayDb } from "@/lib/db";

// GET - Get all holidays
export async function GET(req: NextRequest) {
  try {
    const holidays = await holidayDb.getAll();
    return NextResponse.json({ holidays }, { status: 200 });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { message: "Error fetching holidays", error },
      { status: 500 }
    );
  }
}

// POST - Create or update holiday
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, date, is_working } = body;

    if (!name || !date) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

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



