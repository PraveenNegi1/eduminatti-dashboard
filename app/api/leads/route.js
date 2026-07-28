import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

// If your form always posts from a known domain, replace "*" with that
// exact origin (e.g. "https://www.eduminatti.com") for tighter security.
const ALLOWED_ORIGIN = "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handles the browser's CORS preflight request. Without this, a
// cross-origin POST with a JSON body never reaches POST() below.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, message, source } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const leadRef = await adminDb.collection("leads").add({
      name,
      email,
      phone: phone || "",
      message: message || "",
      source: source || "unknown",
      status: "new", // new | contacted | converted | rejected
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { id: leadRef.id, success: true },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err) {
    console.error("POST /api/leads error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 401, headers: corsHeaders() }
      );
    }

    await adminAuth.verifyIdToken(token); // throws if invalid/expired

    const snapshot = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ leads }, { status: 200, headers: corsHeaders() });
  } catch (err) {
    console.error("GET /api/leads error:", err);
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() }
    );
  }
}