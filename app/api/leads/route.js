import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";


export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, message, source } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const leadRef = await adminDb.collection("leads").add({
      name,
      email,
      phone: phone || "",
      message: message || "",
      source: source || "unknown",
      status: "new", // new | contacted | converted | rejected
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: leadRef.id, success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/leads error:", err);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}


export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    await adminAuth.verifyIdToken(token); // throws if invalid/expired

    const snapshot = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ leads }, { status: 200 });
  } catch (err) {
    console.error("GET /api/leads error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}