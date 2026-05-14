"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Home, Search, Trash2 } from "lucide-react"

type SavedSearch = {
  query: string
  location: string
  category: string
  condition: string
  savedAt: string
}

const SAVED_SEARCHES_KEY = "caterbids_saved_searches"

function readSavedSearches() {
  return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]") as SavedSearch[]
}

function writeSavedSearches(items: SavedSearch[]) {
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items))
}

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  useEffect(() => {
    setSavedSearches(readSavedSearches())
  }, [])

  function removeSavedSearch(index: number) {
    const next = savedSearches.filter((_, itemIndex) => itemIndex !== index)
    writeSavedSearches(next)
    setSavedSearches(next)
  }

  return (
    <main className="app-bg min-h-screen px-4 pb-10 text-white">
      <header className="bottom-nav sticky top-0 z-50 -mx-4 mb-5 px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/account"
            className="soft-button flex items-center gap-1 rounded-2xl px-3 py-2 text-sm"
          >
            <ArrowLeft size={18} />
            Account
          </Link>

          <Link href="/" className="text-center">
            <h1 className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">
              BUY • SELL • SAVE
            </p>
          </Link>

          <Link
            href="/"
            className="soft-button flex items-center gap-1 rounded-2xl px-3 py-2 text-sm"
          >
            <Home size={18} />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <section className="premium-card rounded-[2rem] p-6 text-center">
          <div className="orange-glow mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
            <Search size={26} />
          </div>
          <h2 className="mt-4 text-2xl font-black">Saved Searches</h2>
          <p className="mt-2 text-sm text-white/60">Run saved searches again.</p>
        </section>

        {savedSearches.length > 0 && (
          <section className="mt-5 grid gap-3">
            {savedSearches.map((item, index) => {
              const params = new URLSearchParams()
              params.set("q", item.query)
              params.set("category", item.category)
              params.set("condition", item.condition)
              if (item.location && item.location !== "All UK") {
                params.set("city", item.location)
                params.set("location", item.location)
              }

              return (
                <article key={`${item.query}-${item.savedAt}-${index}`} className="premium-card rounded-3xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black">{item.query}</h3>
                      <p className="mt-1 text-sm text-white/60">
                        {item.location || "All UK"} • {item.category} • {item.condition}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/search?${params.toString()}`}
                        className="premium-button rounded-2xl px-4 py-2 text-sm font-bold"
                      >
                        Search
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeSavedSearch(index)}
                        className="soft-button rounded-2xl px-3 py-2 text-sm font-bold text-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
