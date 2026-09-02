"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { CATEGORY_OPTIONS, subcategoriesForCategory } from "@/lib/categories"
import {
  CONDITION_OPTIONS,
  DELIVERY_OPTION_OPTIONS,
  POWER_TYPE_OPTIONS,
  TESTED_STATUS_OPTIONS,
  WARRANTY_TYPE_OPTIONS,
} from "@/lib/listing-trust"
import TrailerDetailsForm from "@/app/post-listing/TrailerDetailsForm"
import BusinessDetailsForm from "@/app/post-listing/BusinessDetailsForm"
import { sellerUpdateListing, sellerDeleteListing } from "../../listing-actions"

const LISTING_IMAGES_BUCKET = "listing-images"

const INPUT =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
const SELECT = INPUT
const LABEL = "mb-1 block text-sm font-black text-[#002E5D]"
const SECTION =
  "rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-6"

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label} {required && <span className="text-[#FF6B00]">*</span>}
      </span>
      {children}
    </label>
  )
}

type Listing = Record<string, unknown>

function listingImages(listing: Listing): string[] {
  const arr = listing.images
  if (Array.isArray(arr) && arr.length > 0) return arr as string[]
  const url = listing.image_url
  if (typeof url === 'string' && url) return [url]
  return []
}

export default function EditListingForm({ listing }: { listing: Listing }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleting] = useTransition()

  // Core fields
  const [title, setTitle] = useState(String(listing.title || ""))
  const [price, setPrice] = useState(String(listing.price || ""))
  const [location, setLocation] = useState(String(listing.location || ""))
  const [city, setCity] = useState(String(listing.city || ""))
  const [category, setCategory] = useState(String(listing.category || "Catering Equipment"))
  const [subcategory, setSubcategory] = useState(String(listing.subcategory || ""))
  const [equipmentType, setEquipmentType] = useState(String(listing.equipment_type || ""))
  const [description, setDescription] = useState(String(listing.description || ""))
  const [condition, setCondition] = useState(String(listing.condition || ""))
  const [powerType, setPowerType] = useState(String(listing.power_type || ""))
  const [dimensions, setDimensions] = useState(String(listing.dimensions || ""))
  const [serviceHistory, setServiceHistory] = useState(String(listing.service_history || ""))
  const [warrantyType, setWarrantyType] = useState(String(listing.warranty_type || ""))
  const [manualsAvailable, setManualsAvailable] = useState(Boolean(listing.manuals_available))
  const [testedStatus, setTestedStatus] = useState(String(listing.tested_status || ""))
  const [deliveryOption, setDeliveryOption] = useState(String(listing.delivery_option || ""))
  const [collectionPostcode, setCollectionPostcode] = useState(String(listing.collection_postcode || ""))
  const [vatIncluded, setVatIncluded] = useState(Boolean(listing.vat_included))
  const [weightKg, setWeightKg] = useState(listing.weight_kg != null ? String(listing.weight_kg) : "")
  const [lengthCm, setLengthCm] = useState(listing.length_cm != null ? String(listing.length_cm) : "")
  const [widthCm, setWidthCm] = useState(listing.width_cm != null ? String(listing.width_cm) : "")
  const [heightCm, setHeightCm] = useState(listing.height_cm != null ? String(listing.height_cm) : "")

  // Photos
  const [imageUrls, setImageUrls] = useState<string[]>(listingImages(listing))
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  // Error / success
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isVanTrailer = category === "Catering Vans & Trailers"
  const isBusiness = category === "Catering Businesses"

  const trailerInitialData =
    isVanTrailer && listing.trailer_details && typeof listing.trailer_details === "object"
      ? (listing.trailer_details as Record<string, unknown>)
      : {}

  const businessInitialData =
    isBusiness && listing.business_details && typeof listing.business_details === "object"
      ? (listing.business_details as Record<string, unknown>)
      : {}

  const initialIsConfidential =
    isBusiness && typeof listing.is_confidential === "boolean"
      ? listing.is_confidential
      : false

  function handleCategoryChange(next: string) {
    setCategory(next)
    setSubcategory(subcategoriesForCategory(next)[0] || "")
  }

  function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)
    )
    const slots = 6 - imageUrls.length - newImageFiles.length
    const selected = files.slice(0, Math.max(0, slots))
    if (!selected.length) return

    Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
      .then((previews) => {
        setNewImageFiles((prev) => [...prev, ...selected])
        setNewImagePreviews((prev) => [...prev, ...previews])
      })
      .catch(() => setError("Could not prepare one of those images."))

    e.target.value = ""
  }

  function removeExistingImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewImage(index: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaved(false)

    if (!title.trim() || !price.trim() || !location.trim()) {
      setError("Title, price and location are required.")
      return
    }

    startTransition(async () => {
      // Upload any new images to Supabase storage
      let allImageUrls = [...imageUrls]
      if (newImageFiles.length > 0) {
        const supabase = createClient()
        const user = await getCurrentUser(supabase)
        if (!user) { setError("Session expired. Please log in again."); return }

        for (const file of newImageFiles) {
          const ext = file.name.split(".").pop() || "jpg"
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from(LISTING_IMAGES_BUCKET)
            .upload(fileName, file, { cacheControl: "3600", upsert: false })
          if (upErr) { setError("Image upload failed. Please try again."); return }
          const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(fileName)
          if (data?.publicUrl) allImageUrls.push(data.publicUrl)
        }
      }

      // Collect formData from the form element
      const formEl = e.currentTarget ?? (e as unknown as { currentTarget: HTMLFormElement }).currentTarget
      const formData = new FormData(formEl)

      // Override programmatic fields
      formData.set("title", title)
      formData.set("price", price)
      formData.set("location", location)
      formData.set("city", city)
      formData.set("category", category)
      formData.set("subcategory", subcategory)
      formData.set("equipment_type", equipmentType)
      formData.set("description", description)
      formData.set("condition", condition)
      formData.set("power_type", powerType)
      formData.set("dimensions", dimensions)
      formData.set("service_history", serviceHistory)
      formData.set("warranty_type", warrantyType)
      formData.set("manuals_available", manualsAvailable ? "on" : "")
      formData.set("tested_status", testedStatus)
      formData.set("delivery_option", deliveryOption)
      formData.set("collection_postcode", collectionPostcode)
      formData.set("vat_included", vatIncluded ? "on" : "")
      formData.set("weight_kg", weightKg)
      formData.set("length_cm", lengthCm)
      formData.set("width_cm", widthCm)
      formData.set("height_cm", heightCm)
      formData.set("images", JSON.stringify(allImageUrls))
      formData.set("image_url", allImageUrls[0] || "")

      const result = await sellerUpdateListing(String(listing.id), formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSaved(true)
        setNewImageFiles([])
        setNewImagePreviews([])
        setImageUrls(allImageUrls)
      }
    })
  }

  async function handleDelete() {
    startDeleting(async () => {
      const result = await sellerDeleteListing(String(listing.id))
      if (!result.success) {
        setError(result.error)
        setShowDeleteConfirm(false)
      } else {
        router.push("/account")
      }
    })
  }

  const totalImages = imageUrls.length + newImageFiles.length

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Link
            href="/account"
            className="flex items-center gap-1.5 text-sm font-black text-[#002E5D] hover:text-[#FF6B00]"
          >
            <ArrowLeft className="h-4 w-4" />
            My account
          </Link>
          <h1 className="text-base font-black text-[#002E5D]">Edit listing</h1>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        {/* Error / success banners */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Changes saved.
          </div>
        )}

        {/* ── PHOTOS ───────────────────────────────────────────────────── */}
        <section className={SECTION}>
          <h2 className="mb-4 text-xl font-black text-[#002E5D]">Photos</h2>
          {totalImages === 0 && (
            <p className="mb-3 text-sm font-semibold text-slate-400">No photos yet.</p>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {newImagePreviews.map((src, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[#FF6B00]/30 bg-slate-100">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {totalImages < 6 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-black text-[#002E5D] hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleImageFiles}
              />
              + Add photos ({totalImages}/6)
            </label>
          )}
        </section>

        {/* ── CORE DETAILS ─────────────────────────────────────────────── */}
        <section className={SECTION}>
          <h2 className="mb-4 text-xl font-black text-[#002E5D]">Listing details</h2>
          <div className="space-y-4">
            <Field label="Title" required>
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. Rational SCC61 Combi Oven"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price" required>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="e.g. £1,500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[#FF6B00]"
                  checked={vatIncluded}
                  onChange={(e) => setVatIncluded(e.target.checked)}
                />
                <span className="text-sm font-black text-[#002E5D]">VAT included in price</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location" required>
                <input
                  type="text"
                  className={INPUT}
                  placeholder="e.g. Manchester, Greater Manchester"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Field>
              <Field label="Town / city">
                <input
                  type="text"
                  className={INPUT}
                  placeholder="e.g. Manchester"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className={SELECT} value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                  {CATEGORY_OPTIONS.filter((c) => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subcategory">
                <select
                  className={SELECT}
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                >
                  {subcategoriesForCategory(category).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Equipment type">
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. Combi oven"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
              />
            </Field>

            <Field label="Description">
              <textarea
                className={INPUT}
                rows={5}
                placeholder="Describe the item — age, usage, any faults, what's included"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* ── CONDITION & SPECS ────────────────────────────────────────── */}
        <section className={SECTION}>
          <h2 className="mb-4 text-xl font-black text-[#002E5D]">Condition and specifications</h2>
          <div className="space-y-4">
            <Field label="Condition">
              <select className={SELECT} value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">— Select —</option>
                {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="Power type">
              <select className={SELECT} value={powerType} onChange={(e) => setPowerType(e.target.value)}>
                <option value="">— Select —</option>
                {POWER_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="Dimensions (freeform)">
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. 850 x 720 x 1500mm (W×D×H)"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  ["Weight (kg)", weightKg, setWeightKg],
                  ["Length (cm)", lengthCm, setLengthCm],
                  ["Width (cm)", widthCm, setWidthCm],
                  ["Height (cm)", heightCm, setHeightCm],
                ] as [string, string, (v: string) => void][]
              ).map(([label, val, setter]) => (
                <Field key={label} label={label}>
                  <input
                    type="number"
                    className={INPUT}
                    placeholder="—"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                  />
                </Field>
              ))}
            </div>

            <Field label="Tested status">
              <select className={SELECT} value={testedStatus} onChange={(e) => setTestedStatus(e.target.value)}>
                <option value="">— Select —</option>
                {TESTED_STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="Service history">
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. Serviced annually, last service Jan 2025"
                value={serviceHistory}
                onChange={(e) => setServiceHistory(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* ── WARRANTY & MANUALS ───────────────────────────────────────── */}
        <section className={SECTION}>
          <h2 className="mb-4 text-xl font-black text-[#002E5D]">Warranty and manuals</h2>
          <div className="space-y-4">
            <Field label="Warranty">
              <select className={SELECT} value={warrantyType} onChange={(e) => setWarrantyType(e.target.value)}>
                <option value="">— Select —</option>
                {WARRANTY_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-[#FF6B00]"
                checked={manualsAvailable}
                onChange={(e) => setManualsAvailable(e.target.checked)}
              />
              <span className="text-sm font-black text-[#002E5D]">Manuals available</span>
            </label>
          </div>
        </section>

        {/* ── DELIVERY ─────────────────────────────────────────────────── */}
        <section className={SECTION}>
          <h2 className="mb-4 text-xl font-black text-[#002E5D]">Delivery</h2>
          <div className="space-y-4">
            <Field label="Delivery option">
              <select className={SELECT} value={deliveryOption} onChange={(e) => setDeliveryOption(e.target.value)}>
                <option value="">— Select —</option>
                {DELIVERY_OPTION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Collection postcode">
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. M1 1AE"
                value={collectionPostcode}
                onChange={(e) => setCollectionPostcode(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* ── CATERING VANS & TRAILERS ─────────────────────────────────── */}
        {isVanTrailer && (
          <TrailerDetailsForm initialData={trailerInitialData} listingType={subcategory} />
        )}

        {/* ── CATERING BUSINESSES ──────────────────────────────────────── */}
        {isBusiness && (
          <BusinessDetailsForm
            initialData={businessInitialData}
            initialIsConfidential={initialIsConfidential}
          />
        )}

        {/* ── SAVE BUTTON ──────────────────────────────────────────────── */}
        <div className="pb-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#FF6B00]/20 transition hover:bg-[#E55A00] disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* ── DELETE CONFIRMATION MODAL ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-[#002E5D]">Remove this listing?</h2>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              This will remove your listing from the site. Buyers will no longer be able to find it.
              This cannot be undone by you. Contact support if you need it restored.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Any listing credit or free listing slot you used will not be refunded.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#002E5D] hover:bg-slate-50"
              >
                Keep listing
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isDeleting ? "Removing…" : "Yes, remove it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
