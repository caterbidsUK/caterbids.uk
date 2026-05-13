"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, ExternalLink, Heart, Home, MapPin, Tag, Trash2 } from "lucide-react"

type SavedFavourite = {
  id: string
  source: "caterbids" | "ebay"
  title: string
  price: string
  location: string
  category?: string
  condition?: string
  imageUrl?: string
  url?: string
  savedAt: string
}

const FAVOURITES_KEY = "caterbids_favourites"

function readSavedFavourites() {
  return JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]") as SavedFavourite[]
}

function writeSavedFavourites(items: SavedFavourite[]) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(items))
}

export default function FavouritesPage() {
  const [favourites, setFavourites] = useState<SavedFavourite[]>([])

  useEffect(() => {
    setFavourites(readSavedFavourites())
  }, [])

  function removeFavourite(id: string) {
    const next = favourites.filter((item) => item.id !== id)
    writeSavedFavourites(next)
    setFavourites(next)
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
        <section className="premium-shell rounded-[2rem] p-6">
          <div className="orange-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
            <Heart size={24} className="fill-[#FF6B00]" />
          </div>
          <h2 className="mt-4 text-3xl font-black">Favourites</h2>
          <p className="mt-2 text-sm text-white/60">
            Saved CaterBids and eBay listings from your searches.
          </p>
        </section>

        {favourites.length === 0 ? (
          <section className="premium-card mt-5 rounded-[2rem] p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-white/30" />
            <h3 className="mt-4 text-xl font-black">No favourites yet</h3>
            <p className="mt-2 text-sm text-white/60">
              Tap Save Favourite on any search result to keep it here.
            </p>
            <Link
              href="/search"
              className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-bold"
            >
              Search listings
            </Link>
          </section>
        ) : (
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favourites.map((item) => (
              <article key={item.id} className="premium-card premium-card-hover overflow-hidden rounded-3xl">
                {item.imageUrl ? (
                  <div className="aspect-[4/3] overflow-hidden bg-white">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-white/5">
                    <Heart className="h-10 w-10 text-white/25" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-black leading-snug">{item.title}</h3>
                    {item.price && (
                      <span className="premium-badge shrink-0 rounded-xl px-2 py-1 text-xs font-black">
                        {item.price}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                    {item.location && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </span>
                    )}
                    {item.category && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        <Tag className="h-3 w-3" />
                        {item.category}
                      </span>
                    )}
                    {item.condition && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/65">
                        {item.condition}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {item.url && (
                      <Link
                        href={item.url}
                        target={item.source === "ebay" ? "_blank" : undefined}
                        className="premium-button flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold"
                      >
                        View
                        {item.source === "ebay" && <ExternalLink className="h-3 w-3" />}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFavourite(item.id)}
                      className="soft-button flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
