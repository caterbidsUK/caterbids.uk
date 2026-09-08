'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBulkListings, type BulkListingRow, type BulkRowResult } from '@/lib/bulk-listing'
import { parseListingPrice, priceKey } from '@/lib/price'

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedRow = BulkListingRow & {
  _rowNum: number
  _parseError: string | null  // red; skips row on submit
  _isDuplicate: boolean       // amber; does NOT skip
}

type SubmitResult = {
  results: BulkRowResult[]
  created: number
  duplicates: number
  failed: number
}

// ── CSV parser ─────────────────────────────────────────────────────────────────
// Supports tab-separated (Excel/Sheets paste) and comma-separated with quoting.
// Detects a header row by looking for "title", "price", or "location" in the first row.
// Without a header, columns are: title, price, location, category, subcategory, condition, description.
// Validates price with parseListingPrice and detects within-batch and existing-listing duplicates.

const COLS = ['title', 'price', 'location', 'category', 'subcategory', 'condition', 'description']

function parseCsv(text: string, existingKeySet: Set<string>): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []

  const isTab = lines.some((l) => l.includes('\t'))

  function splitLine(line: string): string[] {
    if (isTab) return line.split('\t').map((s) => s.trim())
    const fields: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++ }
        else q = !q
      } else if (ch === ',' && !q) {
        fields.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    fields.push(cur.trim())
    return fields
  }

  // Default column index: positional
  let colIdx: Record<string, number> = Object.fromEntries(COLS.map((c, i) => [c, i]))
  let dataLines = lines

  // Detect header row
  const firstCells = splitLine(lines[0]).map((c) => c.toLowerCase().trim())
  if (firstCells.some((c) => c === 'title' || c === 'price' || c === 'location')) {
    dataLines = lines.slice(1)
    colIdx = Object.fromEntries(COLS.map((c) => [c, -1]))
    firstCells.forEach((cell, idx) => {
      const norm = cell.replace(/[^a-z]/g, '')
      const match = COLS.find((c) => c === norm)
      if (match) colIdx[match] = idx
    })
  }

  function get(cells: string[], col: string): string {
    const i = colIdx[col]
    return i >= 0 && i < cells.length ? cells[i] : ''
  }

  const batchSeen = new Set<string>()

  return dataLines
    .slice(0, 100)
    .map((line, i) => {
      const cells = splitLine(line)
      const title = get(cells, 'title')
      const rawPrice = get(cells, 'price')
      const location = get(cells, 'location')
      const category = get(cells, 'category') || 'Catering Equipment'

      // Validate required fields, including price ambiguity check
      const errors: string[] = []
      if (!title) errors.push('Missing: title')
      if (!rawPrice) {
        errors.push('Missing: price')
      } else if (parseListingPrice(rawPrice) === null) {
        errors.push('Ambiguous price — write it as 15 or 15000')
      }
      if (!location) errors.push('Missing: location')

      // Duplicate detection: only for rows with all three required fields and a valid price
      let isDuplicate = false
      if (title && rawPrice && parseListingPrice(rawPrice) !== null && location) {
        const dk = [title, priceKey(rawPrice), location, category]
          .map((s) => s.toLowerCase())
          .join('|')
        if (existingKeySet.has(dk) || batchSeen.has(dk)) isDuplicate = true
        batchSeen.add(dk)
      }

      return {
        _rowNum: i + 1,
        _parseError: errors.length ? errors.join('; ') : null,
        _isDuplicate: isDuplicate,
        title,
        price: rawPrice,  // raw value; server re-validates independently
        location,
        category,
        subcategory: get(cells, 'subcategory') || null,
        condition: get(cells, 'condition') || null,
        description: get(cells, 'description') || null,
      }
    })
    .filter((r) => r.title || r.price || r.location) // drop fully blank lines
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkUploadClient({ existingKeys }: { existingKeys: string[] }) {
  const existingKeySet = new Set(existingKeys)

  const [csv, setCsv] = useState('')
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleParse() {
    setError(null)
    const parsed = parseCsv(csv, existingKeySet)
    if (!parsed.length) {
      setError('No rows found. Paste your CSV or spreadsheet data above.')
      return
    }
    setRows(parsed)
    setSubmitResult(null)
  }

  function handleReset() {
    setCsv('')
    setRows(null)
    setSubmitResult(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!rows) return
    const validRows: BulkListingRow[] = rows
      .filter((r) => !r._parseError)
      .map(({ _rowNum: _r, _parseError: _e, _isDuplicate: _d, ...rest }) => rest)

    if (!validRows.length) {
      setError('No valid rows to submit. Fix the errors in the preview above.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await createBulkListings(validRows)
      if (!res.success) {
        setError(res.error)
        return
      }
      setSubmitResult({
        results: res.results,
        created: res.created,
        duplicates: res.duplicates,
        failed: res.failed,
      })
      setRows(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Results ────────────────────────────────────────────────────────────────

  if (submitResult) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-center">
            <p className="text-3xl font-black text-white">{submitResult.created}</p>
            <p className="mt-1 text-xs font-bold text-emerald-300">Drafts created</p>
          </div>
          <div
            className={`rounded-2xl border p-4 text-center ${
              submitResult.duplicates > 0
                ? 'border-amber-400/20 bg-amber-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className="text-3xl font-black text-white">{submitResult.duplicates}</p>
            <p className="mt-1 text-xs font-bold text-amber-300">Possible duplicates</p>
          </div>
          <div
            className={`rounded-2xl border p-4 text-center ${
              submitResult.failed > 0
                ? 'border-red-400/20 bg-red-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className="text-3xl font-black text-white">{submitResult.failed}</p>
            <p className="mt-1 text-xs font-bold text-red-300">Failed</p>
          </div>
        </div>

        {submitResult.duplicates > 0 && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-bold text-amber-200">
              Possible duplicates were still created as drafts — a dealer often has multiple
              identical items. Review them and delete any you don&apos;t need.
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {['#', 'Title', 'Status', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {submitResult.results.map((r) => (
                  <tr
                    key={r.index}
                    className={r.error ? 'bg-red-500/5' : r.isDuplicate ? 'bg-amber-500/5' : ''}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{r.index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">{r.title}</td>
                    <td className="px-4 py-3">
                      {r.error ? (
                        <>
                          <span className="rounded-full border border-red-400/30 bg-red-500/15 px-2 py-1 text-xs font-black text-red-300">
                            Failed
                          </span>
                          <p className="mt-1 text-xs text-red-400/80">{r.error}</p>
                        </>
                      ) : r.isDuplicate ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-xs font-black text-amber-300">
                          Possible duplicate
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs font-black text-emerald-300">
                          Draft created
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.listingId && (
                        <Link
                          href={`/account/listings/${r.listingId}/edit`}
                          className="text-xs font-bold text-[#FF6B00] hover:text-[#ff9a4a]"
                        >
                          Add photos & publish →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/account/listings"
            className="rounded-2xl bg-[#FF6B00] px-6 py-3 text-sm font-black text-white transition hover:bg-[#e85f00]"
          >
            View my listings
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:bg-white/5"
          >
            Upload another batch
          </button>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  if (rows) {
    const validCount = rows.filter((r) => !r._parseError).length
    const errorCount = rows.filter((r) => r._parseError).length
    const dupCount = rows.filter((r) => r._isDuplicate && !r._parseError).length

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70">
            {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
          </div>
          {errorCount > 0 && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
              {errorCount} with errors — will be skipped
            </div>
          )}
          {dupCount > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-300">
              {dupCount} possible duplicate{dupCount !== 1 ? 's' : ''} — will still be created
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {['#', 'Title', 'Price', 'Location', 'Category', 'Condition', 'Issue'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((r) => (
                  <tr
                    key={r._rowNum}
                    className={r._parseError ? 'bg-red-500/5' : r._isDuplicate ? 'bg-amber-500/5' : ''}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{r._rowNum}</td>
                    <td className="px-4 py-3 font-semibold text-white">{r.title || '—'}</td>
                    <td className="px-4 py-3 font-mono text-white/70">{r.price || '—'}</td>
                    <td className="px-4 py-3 text-white/70">{r.location || '—'}</td>
                    <td className="px-4 py-3 text-white/60">{r.category}</td>
                    <td className="px-4 py-3 text-white/60">{r.condition || '—'}</td>
                    <td className="px-4 py-3 space-y-1">
                      {r._parseError && (
                        <p className="text-xs font-bold text-red-400">{r._parseError}</p>
                      )}
                      {r._isDuplicate && (
                        <p className="text-xs font-bold text-amber-400">Possible duplicate</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || validCount === 0}
            className="rounded-2xl bg-[#FF6B00] px-6 py-3 text-sm font-black text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? 'Creating drafts…'
              : `Create ${validCount} draft${validCount !== 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:bg-white/5"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Idle ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Format guide */}
      <div className="rounded-2xl border border-white/10 bg-[#001a3a] p-5">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-white/35">
          Format guide
        </p>
        <p className="mb-3 text-sm text-white/60">
          Paste from Excel or Google Sheets (tab-separated), or comma-separated CSV.
          Include a header row or keep columns in this order:
        </p>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
          <pre className="p-4 text-xs leading-relaxed text-white/70">{`title,price,location,category,condition,description
Commercial Fridge 600L,£350,Birmingham,Catering Equipment,Used,Double door upright fridge
Conveyor Toaster,£120,Manchester,Cooking Equipment,Good
6-Burner Gas Range,£800,London,Cooking Equipment,Used`}</pre>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-white/45">
          <li>• <strong className="text-white/65">Required:</strong> title, price, location</li>
          <li>• <strong className="text-white/65">Optional:</strong> category, subcategory, condition, description</li>
          <li>• Price: write as a plain number or with £ — e.g. 350 or £350. Avoid EU format: 15.000 is ambiguous.</li>
          <li>• Category defaults to &quot;Catering Equipment&quot; if blank</li>
          <li>• Maximum 100 rows per paste — excess rows are ignored</li>
          <li>• All rows are created as <em>drafts</em> — add photos then publish each one</li>
        </ul>
      </div>

      {/* Paste area */}
      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-widest text-white/35">
          Paste your data
        </label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={12}
          placeholder="Paste from Excel, Google Sheets, or a CSV file…"
          className="w-full rounded-2xl border border-white/10 bg-[#001a3a] px-4 py-3 font-mono text-sm text-white placeholder-white/25 focus:border-[#FF6B00]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]/30"
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleParse}
        disabled={!csv.trim()}
        className="rounded-2xl bg-[#FF6B00] px-6 py-3 text-sm font-black text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Preview rows
      </button>
    </div>
  )
}
