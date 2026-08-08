"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";

function EditLeadContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [form, setForm] = useState({ name: "", phone: "", email: "", remarks: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const snap = await getDoc(doc(db, "leads", id));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          const data = snap.data();
          console.log("Loaded lead:", data);
          setForm({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            remarks: data.remarks || "",
          });
        }
      } catch (err) {
        console.error("Failed to load lead:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [id]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Enter a name.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Enter a valid email address.";
    }
    if (form.phone && !/^[+()\d\s-]{6,}$/.test(form.phone)) {
      next.phone = "Enter a valid mobile number.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "leads", id), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        remarks: form.remarks.trim(),
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err) {
      console.error("Failed to update lead:", err);
      setErrors((er) => ({ ...er, form: "Couldn't save changes. Try again." }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] px-4 py-10">
        <div className="mx-auto max-w-xl">
          <div className="h-8 w-40 animate-pulse rounded bg-[#E7E3D8]" />
          <div className="mt-6 space-y-4 rounded-2xl border border-[#E7E3D8] bg-white p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[#F0EDE4]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#E7E3D8] bg-white p-8 text-center">
          <p className="text-sm font-medium text-[#171B1F]">Lead not found</p>
          <p className="mt-1 text-sm text-[#9A968A]">
            It may have been deleted already.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-lg bg-[#0E7A6E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C6A5F]"
          >
            Back to leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="sticky top-0 z-10 border-b border-[#E7E3D8] bg-[#FAF9F6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image className="h-10 w-50" src="/logo.png" alt="Eduminatti" width={320} height={32} />
            </Link>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-[#E7E3D8] px-3 py-1.5 text-sm font-medium text-[#3A3D40] transition hover:border-[#171B1F] hover:bg-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <div className="mx-auto flex max-w-xl items-center gap-3 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E3D8] text-[#3A3D40] hover:bg-white"
            aria-label="Back to leads"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold tracking-tight text-[#171B1F]">Edit lead</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[#E7E3D8] bg-white p-6"
        >
          <Field label="Name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Full name"
              className={`${inputClass(errors.name)} opacity-70 cursor-not-allowed`}
              disabled
            />
          </Field>

          <Field label="Mobile number" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="-"
              className={`${inputClass(errors.phone)} font-mono opacity-70 cursor-not-allowed`}
              disabled
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="-"
              className={`${inputClass(errors.email)} font-mono opacity-70 cursor-not-allowed`}
              disabled
            />
          </Field>

          <Field label="Remarks">
            <textarea
              value={form.remarks}
              onChange={handleChange("remarks")}
              placeholder="Notes about this lead..."
              rows={4}
              className={`${inputClass()} resize-none`}
            />
          </Field>

          {errors.form && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-[#F0EDE4] pt-5">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-[#E7E3D8] px-4 py-2 text-sm font-medium text-[#3A3D40] hover:bg-[#FAF9F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#0E7A6E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0C6A5F] disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide p-1">
        {label}:
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function inputClass(error) {
  return `w-full rounded-lg border ${
    error ? "border-red-300" : "border-[#E7E3D8]"
  } bg-white px-3 py-2 text-sm text-[#171B1F] outline-none placeholder:text-[#9A968A] focus:border-[#0E7A6E] focus:ring-1 focus:ring-[#0E7A6E]`;
}

export default function EditLeadPage() {
  return (
    <ProtectedRoute>
      <EditLeadContent />
    </ProtectedRoute>
  );
}