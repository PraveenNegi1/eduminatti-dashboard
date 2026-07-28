"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, orderBy, query, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const PAGE_SIZE = 10;

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

function timeAgo(ts) {
  if (!ts?.toDate) return null;
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return ts.toDate().toLocaleDateString();
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingLead, setDeletingLead] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLeads(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Leads listener error:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const s = search.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(s) ||
        lead.email?.toLowerCase().includes(s) ||
        lead.phone?.includes(search)
    );
  }, [leads, search]);

  // Reset to page 1 whenever the search term (or underlying data) changes the result set.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));

  // Keep page in range if leads shrink (e.g. after a delete) while on a later page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedLeads = filteredLeads.slice(pageStart, pageStart + PAGE_SIZE);

  const handleDelete = async (leadId) => {
    try {
      await deleteDoc(doc(db, "leads", leadId));
      setDeletingLead(null);
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#E7E3D8] bg-[#FAF9F6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E7A6E] text-sm font-semibold text-white">
              L
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#171B1F] sm:text-lg">
                Leads
              </h1>
              <p className="hidden text-xs text-[#6B6F73] sm:block">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-[#E7E3D8] px-3 py-1.5 text-sm font-medium text-[#3A3D40] transition hover:border-[#171B1F] hover:bg-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Stats strip */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Total leads" value={leads.length} />
          <StatCard
            label="Added today"
            value={
              leads.filter((l) => {
                const d = l.createdAt?.toDate?.();
                if (!d) return false;
                const today = new Date();
                return (
                  d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear()
                );
              }).length
            }
          />
          <StatCard label="Matching search" value={filteredLeads.length} />
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A968A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3m0 0a7.5 7.5 0 10-10.6 0 7.5 7.5 0 0010.6 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E7E3D8] bg-white py-2 pl-9 pr-3 text-sm text-[#171B1F] outline-none placeholder:text-[#9A968A] focus:border-[#0E7A6E] focus:ring-1 focus:ring-[#0E7A6E]"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : filteredLeads.length === 0 ? (
          <EmptyState hasSearch={!!search} />
        ) : (
          <>
            {/* Mobile: card list, scrollable within a fixed-height panel */}
            <div className="sm:hidden">
              <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                {pagedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-[#E7E3D8] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0E7A6E]/10 text-xs font-semibold text-[#0E7A6E]">
                          {initials(lead.name)}
                        </div>
                        <div>
                          <p className="font-medium text-[#171B1F]">{lead.name}</p>
                          {timeAgo(lead.createdAt) && (
                            <p className="text-xs text-[#9A968A]">{timeAgo(lead.createdAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1.5 font-mono text-xs text-[#3A3D40]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#9A968A]">Mobile</dt>
                        <dd>{lead.phone || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#9A968A]">Email</dt>
                        <dd className="truncate">{lead.email || "—"}</dd>
                      </div>
                    </dl>
                    {(lead.remarks || lead.message) && (
                      <p className="mt-2 line-clamp-2 text-xs text-[#6B6F73]">
                        {lead.remarks || lead.message}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2 border-t border-[#F0EDE4] pt-3">
                      <button
                        onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                        className="flex-1 rounded-lg border border-[#E7E3D8] py-1.5 text-xs font-medium text-[#3A3D40] hover:bg-[#FAF9F6]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingLead(lead)}
                        className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: table with sticky header and a scrollable body */}
            <div className="hidden overflow-hidden rounded-xl border border-[#E7E3D8] bg-white sm:block">
              <div className="max-h-[65vh] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-[1] border-b border-[#E7E3D8] bg-[#F5F3EC] text-xs uppercase tracking-wide text-[#8A8677]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Mobile Number</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Remarks</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE4]">
                    {pagedLeads.map((lead) => (
                      <tr key={lead.id} className="group bg-white transition hover:bg-[#FAF9F6]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E7A6E]/10 text-xs font-semibold text-[#0E7A6E]">
                              {initials(lead.name)}
                            </div>
                            <div>
                              <p className="font-medium text-[#171B1F]">{lead.name}</p>
                              {timeAgo(lead.createdAt) && (
                                <p className="text-xs text-[#9A968A]">{timeAgo(lead.createdAt)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3A3D40]">
                          {lead.phone || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3A3D40]">
                          {lead.email || "—"}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-[#6B6F73]">
                          {lead.remarks || lead.message || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2 opacity-70 transition group-hover:opacity-100">
                            <button
                              onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                              className="rounded-lg border border-[#E7E3D8] px-3 py-1.5 text-xs font-medium text-[#3A3D40] hover:bg-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingLead(lead)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              rangeStart={pageStart + 1}
              rangeEnd={Math.min(pageStart + PAGE_SIZE, filteredLeads.length)}
              total={filteredLeads.length}
            />
          </>
        )}
      </main>

      {deletingLead && (
        <ConfirmDeleteModal
          lead={deletingLead}
          onCancel={() => setDeletingLead(null)}
          onConfirm={() => handleDelete(deletingLead.id)}
        />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange, rangeStart, rangeEnd, total }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    // Show first, last, current, and neighbors; collapse the rest with "…"
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-[#9A968A]">
        Showing <span className="font-medium text-[#3A3D40]">{rangeStart}–{rangeEnd}</span> of{" "}
        <span className="font-medium text-[#3A3D40]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-[#E7E3D8] px-3 py-1.5 text-xs font-medium text-[#3A3D40] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-[#9A968A]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition ${
                p === page
                  ? "bg-[#0E7A6E] text-white"
                  : "border border-[#E7E3D8] text-[#3A3D40] hover:bg-white"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-lg border border-[#E7E3D8] px-3 py-1.5 text-xs font-medium text-[#3A3D40] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#E7E3D8] bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#9A968A]">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-[#171B1F]">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-[#E7E3D8] bg-white/60"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E7E3D8] bg-white/50 p-12 text-center">
      <p className="text-sm font-medium text-[#171B1F]">
        {hasSearch ? "No leads match your search" : "No leads yet"}
      </p>
      <p className="mt-1 text-sm text-[#9A968A]">
        {hasSearch
          ? "Try a different name, email, or mobile number."
          : "New leads will show up here as soon as they come in."}
      </p>
    </div>
  );
}

function ConfirmDeleteModal({ lead, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#171B1F]">Delete lead?</h2>
        <p className="mt-2 text-sm text-[#6B6F73]">
          This will permanently remove <span className="font-medium text-[#171B1F]">{lead.name}</span> from
          your leads. This can&apos;t be undone.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#E7E3D8] px-4 py-2 text-sm font-medium text-[#3A3D40] hover:bg-[#FAF9F6]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}