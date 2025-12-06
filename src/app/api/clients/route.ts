import { NextRequest, NextResponse } from "next/server";
import { bookingDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barber = searchParams.get("barber") || "all";

    const clients = await bookingDb.getUniqueClients(barber === "all" ? undefined : barber);

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { message: "Error fetching clients", error },
      { status: 500 }
    );
  }
}



