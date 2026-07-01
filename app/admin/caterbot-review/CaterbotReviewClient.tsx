"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react"

type ReviewListing = {
  id: string
  title: string | null
  created_at: string | null
  status: string | null
  spec_brand: string | null
  spec_model: string | null
  height_cm: number | null
  width_cm: number | null
  length_cm: number | null
  weight_kg: number | null
  manual_source_url: string | null
  spec_source_url: string | null
  manual_source_name: string | null
  manual_source_type: string | null
  manual_source_validated: boolean | null
  ai_spec_confidence: string | null
  manual_source_match_notes: string | null
  is_flagged: boolean
  flag_reasons: string[]
  caterbot_admin_verified: boolean | null
}

type SaveState = {
  status: "idle" | "saving" | "done" | "error"
  listing_updated: boolean
  kb_updated: boolean
  kb_error: string | null
  http_error: string | null
}

const FLAG_LABELS: Record<string, { label: string; colour: string }> = {
  confidence_low:         { label: "Low confidence",          colour: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  missing_dims:           { label: "Missing dimensions",      colour: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  missing_weight:         { label: "Missing weight",          colour: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  source_unvalidated:     { label: "Unvalidated source",      colour: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  source_domain_mismatch: { label: "Source domain mismatch",  colour: "bg-red-500/20 text-red-300 border-red-500/30" },
}

function confidenceBadge(conf: string | null) {
  const c = (conf || "").toLowerCase()
  if (c === "high")   return <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">HIGH</span>
  if (c === "medium") return <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">MED</span>
  return               <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-300">{conf || "low"}</span>
}

function parseNum(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed)
  return Number.isFinite(n) ? n : null
}

function fmt(n: number | null | undefined) {
  return n != null ? String(n) : ""
}

function RowCard({ listing, onSaved }: { listing: ReviewListing; onSaved: (id: string, patch: Partial<ReviewListing>) => void }) {
  const hasDomainFlag = listing.flag_reasons.includes("source_domain_mismatch")

  const [edit, setEdit] = useState({
    width_cm:   fmt(listing.width_cm),
    height_cm:  fmt(listing.height_cm),
    depth_cm:   fmt(listing.length_cm),
    weight_kg:  fmt(listing.weight_kg),
    source_url: listing.manual_source_url ?? "",
  })
  const [save, setSave] = useState<SaveState>({ status: "idle", listing_updated: false, kb_updated: false, kb_error: null, http_error: null })
  const [showNotes, setShowNotes] = useState(false)

  async function handleSave() {
    setSave({ status: "saving", listing_updated: false, kb_updated: false, kb_error: null, http_error: null })
    try {
      const body = {
        listing_id: listing.id,
        width_cm:   parseNum(edit.width_cm),
        height_cm:  parseNum(edit.height_cm),
        depth_cm:   parseNum(edit.depth_cm),
        weight_kg:  parseNum(edit.weight_kg),
        source_url: edit.source_url.trim() || null,
      }
      const res = await fetch("/api/admin/caterbot-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSave({ status: "error", listing_updated: false, kb_updated: false, kb_error: null, http_error: data.error || `HTTP ${res.status}` })
        return
      }
      setSave({ status: "done", listing_updated: data.listing_updated ?? true, kb_updated: data.kb_updated ?? false, kb_error: data.kb_error ?? null, http_error: null })
      onSaved(listing.id, {
        width_cm:   parseNum(edit.width_cm),
        height_cm:  parseNum(edit.height_cm),
        length_cm:  parseNum(edit.depth_cm),
        weight_kg:  parseNum(edit.weight_kg),
        manual_source_url: edit.source_url.trim() || null,
        caterbot_admin_verified: true,
      })
    } catch (err) {
      setSave({ status: "error", listing_updated: false, kb_updated: false, kb_error: null, http_error: String(err) })
    }
  }

  const borderClass = listing.caterbot_admin_verified
    ? "border-emerald-500/40 bg-emerald-500/[0.04]"
    : hasDomainFlag
    ? "border-red-500/40 bg-red-500/5"
    : listing.is_flagged
    ? "border-amber-500/30 bg-amber-500/[0.04]"
    : "border-white/10 bg-white/[0.03]"

  const createdAt = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—"

  return (
    <div className={`rounded-2xl border p-4 transition ${borderClass}`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {listing.is_flagged && (
            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${hasDomainFlag ? "text-red-400" : "text-amber-400"}`} />
          )}
          <div className="min-w-0">
            <Link
              href={`/listing?id=${listing.id}`}
              target="_blank"
              className="text-sm font-black text-white hover:text-[#FF6B00] flex items-center gap-1"
            >
              {listing.title || "(no title)"}
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            </Link>
            <p className="mt-0.5 text-xs text-white/55">
              <span className="font-bold text-white/80">{listing.spec_brand || "—"}</span>
              {" / "}
              <span className="font-bold text-white/80">{listing.spec_model || "—"}</span>
              {" · "}
              {createdAt}
              {" · "}
              <span className="uppercase">{listing.status || "unknown"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {listing.caterbot_admin_verified && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          )}
          {confidenceBadge(listing.ai_spec_confidence)}
        </div>
      </div>

      {/* Flag reason chips */}
      {listing.flag_reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listing.flag_reasons.map((reason) => {
            const meta = FLAG_LABELS[reason]
            return (
              <span key={reason} className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta?.colour ?? "bg-white/10 text-white/60"}`}>
                {meta?.label ?? reason}
              </span>
            )
          })}
        </div>
      )}

      {/* Edit fields */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {/* Dimensions */}
        <fieldset className="flex items-center gap-1.5">
          <legend className="mb-1 block w-full text-[10px] font-black uppercase tracking-wider text-white/45">W × D × H (cm)</legend>
          <input
            type="number"
            step="0.1"
            value={edit.width_cm}
            onChange={(e) => setEdit((p) => ({ ...p, width_cm: e.target.value }))}
            placeholder="W"
            className="w-16 rounded-xl border border-white/15 bg-white/8 px-2 py-1.5 text-center text-sm font-bold text-white placeholder-white/30 focus:border-[#FF6B00] focus:outline-none"
          />
          <span className="text-white/30">×</span>
          <input
            type="number"
            step="0.1"
            value={edit.depth_cm}
            onChange={(e) => setEdit((p) => ({ ...p, depth_cm: e.target.value }))}
            placeholder="D"
            className="w-16 rounded-xl border border-white/15 bg-white/8 px-2 py-1.5 text-center text-sm font-bold text-white placeholder-white/30 focus:border-[#FF6B00] focus:outline-none"
          />
          <span className="text-white/30">×</span>
          <input
            type="number"
            step="0.1"
            value={edit.height_cm}
            onChange={(e) => setEdit((p) => ({ ...p, height_cm: e.target.value }))}
            placeholder="H"
            className="w-16 rounded-xl border border-white/15 bg-white/8 px-2 py-1.5 text-center text-sm font-bold text-white placeholder-white/30 focus:border-[#FF6B00] focus:outline-none"
          />
        </fieldset>

        {/* Weight */}
        <fieldset>
          <legend className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/45">Weight (kg)</legend>
          <input
            type="number"
            step="0.1"
            value={edit.weight_kg}
            onChange={(e) => setEdit((p) => ({ ...p, weight_kg: e.target.value }))}
            placeholder="kg"
            className="w-20 rounded-xl border border-white/15 bg-white/8 px-2 py-1.5 text-center text-sm font-bold text-white placeholder-white/30 focus:border-[#FF6B00] focus:outline-none"
          />
        </fieldset>
      </div>

      {/* Source URL */}
      <div className="mt-2">
        <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/45">Source URL</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={edit.source_url}
            onChange={(e) => setEdit((p) => ({ ...p, source_url: e.target.value }))}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white placeholder-white/30 focus:border-[#FF6B00] focus:outline-none"
          />
          {edit.source_url.trim().startsWith("http") && (
            <a
              href={edit.source_url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-black text-white/70 transition hover:bg-white/12 hover:text-[#FF6B00]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Source
            </a>
          )}
        </div>
      </div>

      {/* Actions + save result */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={save.status === "saving"}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-black text-white shadow-[0_8px_24px_rgba(255,107,0,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.status === "saving"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : save.status === "done" && save.kb_updated
              ? <CheckCircle2 className="h-3.5 w-3.5" />
              : null}
            {save.status === "saving" ? "Saving…" : "Save & teach KB"}
          </button>

          {listing.manual_source_match_notes && (
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold text-white/45 hover:text-white/70"
            >
              {showNotes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Raw notes
            </button>
          )}
        </div>

        {/* Save result */}
        {save.status === "done" && save.listing_updated && save.kb_updated && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Listing saved — KB updated
          </span>
        )}
        {save.status === "done" && save.listing_updated && !save.kb_updated && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Saved to listing but NOT taught to KB — retry
            {save.kb_error && <span className="ml-1 font-normal text-white/50">({save.kb_error})</span>}
          </span>
        )}
        {save.status === "error" && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Error: {save.http_error}
          </span>
        )}
      </div>

      {/* Raw notes expander */}
      {showNotes && listing.manual_source_match_notes && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-white/40">Raw match notes</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/60">{listing.manual_source_match_notes}</p>
        </div>
      )}
    </div>
  )
}

export default function CaterbotReviewClient() {
  const [listings, setListings] = useState<ReviewListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/caterbot-review")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setListings(data.listings ?? [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSaved(id: string, patch: Partial<ReviewListing>) {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  }

  const flaggedCount = listings.filter((l) => l.is_flagged).length
  const approvedCount = listings.filter((l) => l.caterbot_admin_verified).length

  const sortListings = (list: ReviewListing[]) =>
    [...list].sort((a, b) => {
      if (!!a.caterbot_admin_verified !== !!b.caterbot_admin_verified)
        return a.caterbot_admin_verified ? 1 : -1
      return a.is_flagged === b.is_flagged ? 0 : a.is_flagged ? -1 : 1
    })

  const visible = sortListings(flaggedOnly ? listings.filter((l) => l.is_flagged) : listings)

  return (
    <div className="min-h-screen bg-[#001225] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">

        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">Admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">CaterBot Data Review</h1>
            {!loading && !error && (
              <p className="mt-1 text-sm text-white/55">
                {listings.length} listings with CaterBot data
                {flaggedCount > 0 && (
                  <span className="ml-2 font-black text-amber-400">{flaggedCount} flagged</span>
                )}
                {approvedCount > 0 && (
                  <span className="ml-2 font-black text-emerald-400">{approvedCount} verified</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFlaggedOnly((v) => !v)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                flaggedOnly
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "border border-white/15 bg-white/8 text-white/70 hover:bg-white/12"
              }`}
            >
              {flaggedOnly ? "Flagged only" : "Show all"}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/12 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/admin"
              className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-black text-white/70 hover:bg-white/12"
            >
              ← Admin
            </Link>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 font-black text-red-300">Failed to load</p>
            <p className="mt-1 text-sm text-red-300/70">{error}</p>
            <button onClick={load} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-3 font-black text-white">
              {flaggedOnly ? "No flagged listings" : "No CaterBot listings yet"}
            </p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="space-y-3">
            {visible.map((listing) => (
              <RowCard key={listing.id} listing={listing} onSaved={handleSaved} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
