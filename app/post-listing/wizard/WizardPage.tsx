"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import NextImage from "next/image"
import { ChevronLeft, Loader2, UploadCloud, X, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createListing } from "../actions"
import { CATEGORY_OPTIONS, subcategoriesForCategory } from "@/lib/categories"
import { CONDITION_OPTIONS } from "@/lib/listing-trust"

const LISTING_IMAGES_BUCKET = "listing-images"
const DRAFT_KEY = "caterbids_wizard_draft"
const TOTAL_STEPS = 7

const PALLET_CARDS = [
  { slug: "mini_quarter", name: "Mini Quarter", image: "/images/pallets/pallet_mini_quarter.png", maxH: "0.6m", maxW: "150kg", example: "Small countertop equipment" },
  { slug: "quarter",      name: "Quarter",      image: "/images/pallets/pallet_quarter.png",      maxH: "0.8m", maxW: "300kg", example: "Under-counter fridge, small fryer" },
  { slug: "half",         name: "Half",         image: "/images/pallets/pallet_half.png",          maxH: "1.1m", maxW: "500kg", example: "Single oven, prep table" },
  { slug: "light",        name: "Light",        image: "/images/pallets/pallet_light.png",         maxH: "2.2m", maxW: "750kg", example: "Tall upright fridge (lighter)" },
  { slug: "full",         name: "Full",         image: "/images/pallets/pallet_full.png",          maxH: "2.2m", maxW: "1000kg", example: "Heavy range cooker, full-size" },
] as const

type PalletSlug = (typeof PALLET_CARDS)[number]["slug"]

type CaterBotResult = {
  matchType: "exact" | "approximate" | "no_match"
  sourceUrl: string
  sourceName: string
  sourceCheckedAt: string
  matchNotes: string
  aiConfidence: string
  suggestedTitle: string
  suggestedCategory: string
  suggestedPalletSize: string
  specHeightCm: string
  specWidthCm: string
  specDepthCm: string
  specWeightKg: string
  specPowerType: string
  specVoltage: string
  specPhase: string
  specGasType: string
}

type PersistedDraft = {
  step: number
  category: string
  subcategory: string
  brand: string
  model: string
  specsApplied: boolean
  confirmedSourceUrl: string
  confirmedSourceName: string
  confirmedSourceCheckedAt: string
  specHeightCm: string
  specWidthCm: string
  specDepthCm: string
  specWeightKg: string
  specPowerType: string
  specVoltage: string
  specPhase: string
  specGasType: string
  specAiConfidence: string
  suggestedPalletSize: string
  condition: string
  title: string
  description: string
  price: string
  palletSize: PalletSlug
}

function emptyDraft(): PersistedDraft {
  return {
    step: 1,
    category: "Catering Equipment",
    subcategory: "",
    brand: "",
    model: "",
    specsApplied: false,
    confirmedSourceUrl: "",
    confirmedSourceName: "",
    confirmedSourceCheckedAt: "",
    specHeightCm: "",
    specWidthCm: "",
    specDepthCm: "",
    specWeightKg: "",
    specPowerType: "",
    specVoltage: "",
    specPhase: "",
    specGasType: "",
    specAiConfidence: "",
    suggestedPalletSize: "",
    condition: "Used",
    title: "",
    description: "",
    price: "",
    palletSize: "full",
  }
}

function loadDraft(): PersistedDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyDraft()
    return { ...emptyDraft(), ...JSON.parse(raw) }
  } catch {
    return emptyDraft()
  }
}

function saveDraft(draft: PersistedDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // quota exceeded or private browsing — continue without save
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {}
}

const STEP_LABELS = [
  "Category",
  "Brand & Model",
  "Condition",
  "Photos",
  "Title & Price",
  "Delivery",
  "Review",
]

export default function WizardPage() {
  const [draft, setDraft] = useState<PersistedDraft>(emptyDraft)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [caterBotLoading, setCaterBotLoading] = useState(false)
  const [caterBotResult, setCaterBotResult] = useState<CaterBotResult | null>(null)
  const [stepError, setStepError] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [palletImgErrors, setPalletImgErrors] = useState<ReadonlySet<string>>(new Set())

  // Load draft from localStorage on mount
  useEffect(() => {
    setDraft(loadDraft())
  }, [])

  // Fetch user session + profile
  useEffect(() => {
    const supabase = createClient()
    getCurrentUser(supabase).then(async (user) => {
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from("profiles")
        .select("location, phone, phone_number, collection_postcode")
        .eq("id", user.id)
        .maybeSingle()
      if (profile?.location) setUserLocation(profile.location as string)
      if (profile?.phone_number || profile?.phone) {
        setUserPhone((profile.phone_number || profile.phone) as string)
      }
    })
  }, [])

  const updateDraft = useCallback((patch: Partial<PersistedDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      saveDraft(next)
      return next
    })
  }, [])

  function goTo(step: number) {
    setStepError("")
    setCaterBotResult(null)
    updateDraft({ step })
  }

  function back() {
    if (draft.step > 1) goTo(draft.step - 1)
  }

  // --- Step validators ---
  function validateStep1() {
    if (!draft.category) { setStepError("Please select a category."); return false }
    return true
  }
  function validateStep2() {
    if (!draft.brand.trim() && !draft.model.trim()) {
      setStepError("Enter the brand or model number to continue.")
      return false
    }
    return true
  }
  function validateStep3() {
    if (!draft.condition) { setStepError("Please select a condition."); return false }
    return true
  }
  function validateStep4() {
    if (imageFiles.length === 0) { setStepError("Add at least one photo."); return false }
    return true
  }
  function validateStep5() {
    if (!draft.title.trim()) { setStepError("Add a listing title."); return false }
    if (!draft.price.trim()) { setStepError("Enter a price."); return false }
    return true
  }
  function validateStep6() {
    return true
  }

  // --- CaterBot spec lookup ---
  async function runCaterBotLookup() {
    if (!userId) return
    if (!draft.brand.trim() && !draft.model.trim()) return

    setCaterBotLoading(true)
    setCaterBotResult(null)
    setStepError("")

    try {
      const res = await fetch("/api/caterbot/spec-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandHint: draft.brand,
          modelHint: draft.model,
          categoryHint: draft.category,
          equipment_type: draft.subcategory || draft.category,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.success === false) {
        // CaterBot unavailable — advance without specs
        goTo(3)
        return
      }

      const result: CaterBotResult = {
        matchType: data.matchType ?? "no_match",
        sourceUrl: data.source?.url ?? "",
        sourceName: data.source?.sourceName ?? "",
        sourceCheckedAt: data.source?.checkedAt ?? "",
        matchNotes: data.source?.matchNotes ?? "",
        aiConfidence: String(data.confidence_score ?? ""),
        suggestedTitle: data.specs?.title ?? data.extracted?.product_name ?? "",
        suggestedCategory: data.specs?.category ?? "",
        suggestedPalletSize: data.specs?.suggested_pallet_size ?? "",
        specHeightCm: String(data.specs?.height_cm ?? ""),
        specWidthCm: String(data.specs?.width_cm ?? ""),
        specDepthCm: String(data.specs?.depth_cm ?? ""),
        specWeightKg: String(data.specs?.gross_weight_kg ?? data.specs?.net_weight_kg ?? data.specs?.weight_kg ?? ""),
        specPowerType: data.specs?.power_type ?? "",
        specVoltage: data.specs?.voltage ?? "",
        specPhase: data.specs?.phase ?? "",
        specGasType: data.specs?.gas_type ?? "",
      }

      if (result.matchType === "exact") {
        setCaterBotResult(result)
        // Stay on step 2, show the confirmation UI
      } else {
        // No exact match — advance directly, no spec fill
        goTo(3)
      }
    } catch {
      // CaterBot failed — advance without specs
      goTo(3)
    } finally {
      setCaterBotLoading(false)
    }
  }

  function applySpecs() {
    if (!caterBotResult) return
    const palletFromCaterBot = (caterBotResult.suggestedPalletSize as PalletSlug) || draft.palletSize
    const validPallet = PALLET_CARDS.some((c) => c.slug === palletFromCaterBot)
      ? (palletFromCaterBot as PalletSlug)
      : draft.palletSize
    updateDraft({
      specsApplied: true,
      confirmedSourceUrl: caterBotResult.sourceUrl,
      confirmedSourceName: caterBotResult.sourceName,
      confirmedSourceCheckedAt: caterBotResult.sourceCheckedAt,
      specHeightCm: caterBotResult.specHeightCm,
      specWidthCm: caterBotResult.specWidthCm,
      specDepthCm: caterBotResult.specDepthCm,
      specWeightKg: caterBotResult.specWeightKg,
      specPowerType: caterBotResult.specPowerType,
      specVoltage: caterBotResult.specVoltage,
      specPhase: caterBotResult.specPhase,
      specGasType: caterBotResult.specGasType,
      specAiConfidence: caterBotResult.aiConfidence,
      suggestedPalletSize: caterBotResult.suggestedPalletSize,
      title: draft.title || caterBotResult.suggestedTitle,
      palletSize: validPallet,
    })
    setCaterBotResult(null)
    goTo(3)
  }

  function skipSpecs() {
    setCaterBotResult(null)
    goTo(3)
  }

  // --- Image handling ---
  function handleImageFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
    const combined = [...imageFiles, ...newFiles].slice(0, 10)
    setImageFiles(combined)
    combined.forEach((file, i) => {
      if (imagePreviews[i]) return
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews((prev) => {
          const next = [...prev]
          next[i] = e.target?.result as string
          return next
        })
      }
      reader.readAsDataURL(file)
    })
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadImages(ownerId: string): Promise<string[]> {
    const supabase = createClient()
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(fileName)
      if (data?.publicUrl) urls.push(data.publicUrl)
    }
    return urls
  }

  // --- Step advance ---
  async function advance() {
    setStepError("")

    if (draft.step === 1 && !validateStep1()) return
    if (draft.step === 2) {
      if (!validateStep2()) return
      await runCaterBotLookup()
      return
    }
    if (draft.step === 3 && !validateStep3()) return
    if (draft.step === 4 && !validateStep4()) return
    if (draft.step === 5 && !validateStep5()) return
    if (draft.step === 6 && !validateStep6()) return

    if (draft.step < TOTAL_STEPS) {
      goTo(draft.step + 1)
    }
  }

  // --- Publish ---
  async function publish() {
    if (!userId) { setPublishError("You must be signed in to publish."); return }
    if (!userLocation) { setPublishError("Add a location to your account profile before publishing."); return }

    setPublishing(true)
    setPublishError("")

    try {
      const imageUrls = await uploadImages(userId)
      const fd = new FormData()
      fd.set("title", draft.title)
      fd.set("price", draft.price)
      fd.set("location", userLocation)
      fd.set("category", draft.category)
      if (draft.subcategory) fd.set("subcategory", draft.subcategory)
      fd.set("condition", draft.condition)
      if (draft.description) fd.set("description", draft.description)
      fd.set("pallet_size", draft.palletSize)
      fd.set("images", JSON.stringify(imageUrls))
      if (imageUrls[0]) fd.set("image", imageUrls[0])
      if (userPhone) fd.set("seller_phone", userPhone)

      if (draft.specsApplied) {
        fd.set("manual_source_url", draft.confirmedSourceUrl)
        fd.set("manual_source_name", draft.confirmedSourceName)
        fd.set("manual_source_validated", "true")
        fd.set("manual_source_last_checked_at", draft.confirmedSourceCheckedAt)
        fd.set("specs_verified_by_seller", "on")
        fd.set("ai_spec_confidence", draft.specAiConfidence)
        if (draft.specHeightCm) fd.set("spec_height_cm", draft.specHeightCm)
        if (draft.specWidthCm) fd.set("spec_width_cm", draft.specWidthCm)
        if (draft.specDepthCm) fd.set("spec_depth_cm", draft.specDepthCm)
        if (draft.specWeightKg) fd.set("spec_weight_kg", draft.specWeightKg)
        if (draft.specPowerType) fd.set("spec_power_type", draft.specPowerType)
        if (draft.specVoltage) fd.set("spec_voltage", draft.specVoltage)
        if (draft.specPhase) fd.set("spec_phase", draft.specPhase)
        if (draft.specGasType) fd.set("spec_gas_type", draft.specGasType)
        if (draft.brand) fd.set("spec_brand", draft.brand)
        if (draft.model) fd.set("spec_model", draft.model)
        if (draft.suggestedPalletSize) fd.set("shipping_class", draft.suggestedPalletSize)
      } else {
        if (draft.brand) fd.set("spec_brand", draft.brand)
        if (draft.model) fd.set("spec_model", draft.model)
      }

      const result = await createListing(fd)

      if (result && !result.success) {
        setPublishError(result.error)
        return
      }

      clearDraft()
      if (result?.redirectTo) {
        window.location.href = result.redirectTo
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Could not publish listing.")
    } finally {
      setPublishing(false)
    }
  }

  // --- Render helpers ---
  const isStep2WithCaterBotResult = draft.step === 2 && caterBotResult !== null

  function ProgressBar() {
    return (
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black text-[#002E5D]/50 uppercase tracking-widest">
            Step {draft.step} of {TOTAL_STEPS}
          </span>
          <span className="text-xs font-black text-[#002E5D]">{STEP_LABELS[draft.step - 1]}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#FF6B00] transition-all duration-500"
            style={{ width: `${(draft.step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  function BackButton() {
    if (draft.step === 1) return null
    return (
      <button
        type="button"
        onClick={back}
        className="mb-4 inline-flex items-center gap-1 text-sm font-black text-[#002E5D]/60 hover:text-[#002E5D]"
      >
        <ChevronLeft size={16} /> Back
      </button>
    )
  }

  function NextBtn({ label = "Continue", onClick }: { label?: string; onClick?: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick ?? advance}
        disabled={caterBotLoading || publishing}
        className="mt-6 w-full rounded-2xl bg-[#FF6B00] px-6 py-4 text-base font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        {caterBotLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            CaterBot is searching…
          </span>
        ) : (
          label
        )}
      </button>
    )
  }

  function ErrorBanner() {
    if (!stepError) return null
    return (
      <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {stepError}
      </p>
    )
  }

  // === Step renderers ===

  function Step1() {
    const cats = CATEGORY_OPTIONS.filter((c) => c !== "All Categories")
    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">What are you selling?</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">Choose the best-matching category.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cats.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                const subs = subcategoriesForCategory(cat)
                updateDraft({ category: cat, subcategory: subs[0] || "" })
              }}
              className={`rounded-2xl border px-4 py-4 text-left text-sm font-black transition-all ${
                draft.category === cat
                  ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#B34700]"
                  : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {subcategoriesForCategory(draft.category).length > 0 && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-black text-[#002E5D]">Type</label>
            <select
              value={draft.subcategory}
              onChange={(e) => updateDraft({ subcategory: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            >
              {subcategoriesForCategory(draft.category).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <ErrorBanner />
        <NextBtn />
      </div>
    )
  }

  function Step2() {
    if (isStep2WithCaterBotResult) {
      const r = caterBotResult!
      return (
        <div>
          <h2 className="mb-1 text-2xl font-black text-[#002E5D]">CaterBot found an exact match</h2>
          <p className="mb-4 text-sm font-semibold text-[#002E5D]/60">
            Review the specs below. They come from a verified product source.
          </p>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <span className="text-sm font-black text-emerald-800">Exact Match — {r.sourceName || r.sourceUrl}</span>
            </div>
            {r.matchNotes && (
              <p className="mb-3 text-xs font-semibold text-emerald-700">{r.matchNotes}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                ["Brand", draft.brand],
                ["Model", draft.model],
                r.specHeightCm && ["Height", `${r.specHeightCm} cm`],
                r.specWidthCm && ["Width", `${r.specWidthCm} cm`],
                r.specDepthCm && ["Depth", `${r.specDepthCm} cm`],
                r.specWeightKg && ["Weight", `${r.specWeightKg} kg`],
                r.specPowerType && ["Power", r.specPowerType],
                r.specVoltage && ["Voltage", r.specVoltage],
                r.specGasType && ["Gas", r.specGasType],
                r.suggestedPalletSize && ["Pallet", r.suggestedPalletSize],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-0.5 font-bold text-[#002E5D]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {r.sourceUrl && (
            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-xs font-black text-[#FF6B00] underline"
            >
              Open source to verify →
            </a>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={applySpecs}
              className="rounded-2xl bg-[#FF6B00] px-6 py-4 text-sm font-black text-white"
            >
              Apply these specs
            </button>
            <button
              type="button"
              onClick={skipSpecs}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-[#002E5D]"
            >
              Skip — enter manually
            </button>
          </div>
        </div>
      )
    }

    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Brand & model</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">
          Enter the brand and model number. CaterBot will try to find the exact spec sheet.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#002E5D]">Brand</span>
            <input
              type="text"
              placeholder="e.g. Rational, Lincat, Foster"
              value={draft.brand}
              onChange={(e) => updateDraft({ brand: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#002E5D]">Model number</span>
            <input
              type="text"
              placeholder="e.g. iCombi Pro 6-1/1, LCG4, G2500"
              value={draft.model}
              onChange={(e) => updateDraft({ model: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
        </div>

        <p className="mt-3 text-xs font-semibold text-[#002E5D]/50">
          CaterBot will search for exact specs. If no exact match is found, you can still list — just enter details manually at review.
        </p>

        <ErrorBanner />
        <NextBtn label="Find with CaterBot" />
      </div>
    )
  }

  function Step3() {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Condition</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">Describe the condition of the item honestly.</p>

        <div className="space-y-2">
          {CONDITION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateDraft({ condition: opt })}
              className={`w-full rounded-2xl border px-4 py-4 text-left text-sm font-black transition-all ${
                draft.condition === opt
                  ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#B34700]"
                  : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <ErrorBanner />
        <NextBtn />
      </div>
    )
  }

  function Step4() {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Photos</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">
          Add clear photos from multiple angles. Good photos get more interest.
        </p>

        {imagePreviews.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {imagePreviews.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                <NextImage src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5">
          <UploadCloud size={32} className="text-slate-400" />
          <span className="text-sm font-black text-[#002E5D]">Tap to add photos</span>
          <span className="text-xs font-semibold text-slate-400">JPG, PNG — up to 10 photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
        </label>

        <ErrorBanner />
        <NextBtn />
      </div>
    )
  }

  function Step5() {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Title & price</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">
          Write a clear title and set your price.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#002E5D]">Listing title <span className="text-[#FF6B00]">*</span></span>
            <input
              type="text"
              placeholder="e.g. Rational iCombi Pro 6-1/1 — Excellent condition"
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#002E5D]">Price <span className="text-[#FF6B00]">*</span></span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">£</span>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="1"
                value={draft.price}
                onChange={(e) => updateDraft({ price: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#002E5D]">Description <span className="text-[#002E5D]/40 font-semibold">(optional)</span></span>
            <textarea
              rows={4}
              placeholder="Any extra details buyers should know — service history, accessories included, reason for selling, etc."
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
        </div>

        <ErrorBanner />
        <NextBtn />
      </div>
    )
  }

  function Step6() {
    const selectedCard = PALLET_CARDS.find((c) => c.slug === draft.palletSize) ?? PALLET_CARDS[PALLET_CARDS.length - 1]

    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Delivery size</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">
          Choose the pallet size that fits your item. CaterBot can suggest one if specs are confirmed.
        </p>

        {draft.suggestedPalletSize && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            CaterBot suggests: <span className="capitalize">{draft.suggestedPalletSize.replace(/_/g, " ")}</span>
          </div>
        )}

        <div className="mb-4 overflow-hidden rounded-2xl border border-[#FF6B00] bg-[#FF6B00]/5">
          <div className="flex items-center gap-4 p-4">
            <div className="relative h-20 w-20 flex-shrink-0">
              {!palletImgErrors.has(selectedCard.slug) ? (
                <NextImage
                  src={selectedCard.image}
                  alt={selectedCard.name}
                  fill
                  className="object-contain"
                  onError={() => setPalletImgErrors((s) => new Set([...s, selectedCard.slug]))}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Selected</p>
              <p className="text-lg font-black text-[#002E5D]">{selectedCard.name} Pallet</p>
              <p className="text-xs font-semibold text-[#002E5D]/60">Up to {selectedCard.maxH} tall · up to {selectedCard.maxW}</p>
              <p className="text-xs font-semibold text-[#002E5D]/50">{selectedCard.example}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PALLET_CARDS.filter((c) => c.slug !== draft.palletSize).map((card) => {
            const imgFailed = palletImgErrors.has(card.slug)
            return (
              <button
                key={card.slug}
                type="button"
                onClick={() => updateDraft({ palletSize: card.slug })}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#FF6B00]/50"
              >
                <div className="relative h-12 w-12 flex-shrink-0">
                  {!imgFailed ? (
                    <NextImage
                      src={card.image}
                      alt={card.name}
                      fill
                      className="object-contain"
                      onError={() => setPalletImgErrors((s) => new Set([...s, card.slug]))}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-[#002E5D]">{card.name}</p>
                  <p className="text-[10px] font-semibold text-[#002E5D]/50">{card.maxW}</p>
                </div>
              </button>
            )
          })}
        </div>

        <ErrorBanner />
        <NextBtn />
      </div>
    )
  }

  function Step7() {
    const selectedPallet = PALLET_CARDS.find((c) => c.slug === draft.palletSize)
    const rows: [string, string][] = [
      ["Category", draft.subcategory ? `${draft.category} — ${draft.subcategory}` : draft.category],
      ["Brand / Model", [draft.brand, draft.model].filter(Boolean).join(" ") || "Not specified"],
      ["Condition", draft.condition],
      ["Photos", `${imageFiles.length} photo${imageFiles.length !== 1 ? "s" : ""}`],
      ["Title", draft.title],
      ["Price", `£${draft.price}`],
      ["Pallet", selectedPallet ? `${selectedPallet.name} (up to ${selectedPallet.maxW})` : draft.palletSize],
      ...(draft.specsApplied
        ? [["Specs source", draft.confirmedSourceName || draft.confirmedSourceUrl] as [string, string]]
        : []),
    ]

    return (
      <div>
        <h2 className="mb-1 text-2xl font-black text-[#002E5D]">Review & publish</h2>
        <p className="mb-6 text-sm font-semibold text-[#002E5D]/60">Check everything looks right before publishing.</p>

        {imagePreviews.length > 0 && (
          <div className="mb-4 grid grid-cols-4 gap-2">
            {imagePreviews.slice(0, 4).map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                <NextImage src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
              <span className="text-right text-sm font-bold text-[#002E5D]">{value || "—"}</span>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STEP_LABELS.slice(0, -1).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-[#002E5D] hover:border-[#FF6B00]/50"
            >
              Edit {label}
            </button>
          ))}
        </div>

        {!userLocation && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Add a location to your account profile before publishing.
          </div>
        )}

        {publishError && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {publishError}
          </p>
        )}

        <button
          type="button"
          onClick={publish}
          disabled={publishing || !userLocation}
          className="w-full rounded-2xl bg-[#FF6B00] px-6 py-4 text-base font-black text-white disabled:cursor-wait disabled:opacity-60"
        >
          {publishing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Publishing…
            </span>
          ) : (
            "Publish listing"
          )}
        </button>
      </div>
    )
  }

  const steps: Record<number, () => ReactNode> = {
    1: Step1,
    2: Step2,
    3: Step3,
    4: Step4,
    5: Step5,
    6: Step6,
    7: Step7,
  }

  return (
    <div className="min-h-screen bg-[#002E5D]">
      <div className="mx-auto max-w-xl px-4 py-8 pb-20">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">Sell on CaterBids</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <ProgressBar />
          <BackButton />
          {(steps[draft.step] ?? Step1)()}
        </div>
      </div>
    </div>
  )
}
