"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

type Props = {
  value: string | null
  onChange: (url: string | null) => void
}

export default function BlogImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("Only JPEG, PNG, or WebP files are accepted.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.")
      return
    }

    setError(null)
    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `blog-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(fileName, file, { upsert: false })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data } = supabase.storage.from("blog-images").getPublicUrl(fileName)
      onChange(data.publicUrl)
    } catch {
      setError("Upload failed. Try again.")
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="featured_image_url" value={value ?? ""} />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Featured" className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-xl bg-black/60 px-2.5 py-1 text-xs font-black text-white hover:bg-black/80"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/4 text-sm font-semibold text-white/50 hover:border-[#FF6B00]/50 hover:text-white/80 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Click to upload featured image"}
        </button>
      )}
      {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
