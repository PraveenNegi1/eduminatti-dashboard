"use client";

// It POSTs straight to /api/leads, which saves it in Firestore and the dashboard
// (using a realtime listener) picks it up instantly — no page refresh needed.

import { useState } from "react";

export default function ExampleLeadForm({ source = "website-form" }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      // "https://dashboard.yourdomain.com/api/leads"
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setStatus("success");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="name"
        required
        placeholder="Full name"
        value={form.name}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="phone"
        placeholder="Phone"
        value={form.phone}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        name="message"
        placeholder="Message"
        value={form.message}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        rows={3}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending..." : "Submit"}
      </button>
      {status === "success" && (
        <p className="text-sm text-green-600">Thanks! We&apos;ll be in touch.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong — try again.</p>
      )}
    </form>
  );
}