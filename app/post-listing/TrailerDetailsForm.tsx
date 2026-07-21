"use client"

import { useState } from "react"

// ── Helper functions for hydrating state from JSONB initialData ──────────────
function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}
function numStr(v: unknown): string {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  return ''
}
function initEquipmentRows(v: unknown): EquipmentRow[] {
  if (!Array.isArray(v)) return []
  return v.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: crypto.randomUUID(),
      item: str(row.item),
      make_model: str(row.make_model),
      power_source: str(row.power_source) || 'Electric',
      condition: str(row.condition) || 'Working',
      included: str(row.included) || 'Yes',
    }
  })
}

// Asset types that determine which chassis fields to show
const VAN_ASSET_TYPES = ["Food van", "Horsebox conversion", "Container unit"]
const TRAILER_ASSET_TYPES = ["Catering trailer", "Concession unit", "Coffee cart"]

const ELECTRICAL_SUPPLY_OPTIONS = [
  "240V 16A hook-up",
  "240V 32A hook-up",
  "110V",
  "12V leisure battery",
  "Solar",
  "None",
]

const DOCUMENTS_OPTIONS = [
  "V5C",
  "Certificate of Conformity",
  "IVA certificate",
  "Gas Safety Cert",
  "Electrical Cert",
  "Fire risk assessment",
  "HACCP pack",
  "Service history",
]

// Datalist suggestions for Section 7 equipment rows
const EQUIPMENT_SUGGESTIONS = [
  "fryer",
  "griddle",
  "char grill",
  "6-burner range",
  "oven",
  "salamander",
  "pizza oven",
  "crepe plate",
  "bain marie",
  "hot cupboard",
  "coffee machine",
  "grinder",
  "undercounter fridge",
  "freezer",
  "prep fridge",
  "display fridge",
  "ice machine",
  "microwave",
  "slush machine",
  "extraction hood",
]

type EquipmentRow = {
  id: string
  item: string
  make_model: string
  power_source: string
  condition: string
  included: string
}

function newEquipmentRow(): EquipmentRow {
  return { id: crypto.randomUUID(), item: "", make_model: "", power_source: "Electric", condition: "Working", included: "Yes" }
}

// Shared field style tokens matching the existing wizard
const INPUT =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
const SELECT = INPUT
const LABEL = "mb-1 block text-sm font-black text-[#002E5D]"
const REQ = <span className="text-[#FF6B00]">*</span>
const SECTION =
  "rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-6"

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-4 text-2xl font-black tracking-[-0.035em]">{title}</h2>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label} {required && REQ}
      </span>
      {children}
    </label>
  )
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`cursor-pointer rounded-2xl border px-4 py-2 text-sm font-black transition ${
            value === opt
              ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#B34700]"
              : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/40"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`cursor-pointer rounded-2xl border px-4 py-2 text-sm font-black transition ${
            selected.includes(opt)
              ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#B34700]"
              : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/40"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="sr-only"
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

interface TrailerDetailsFormProps {
  // When editing an existing listing, pass the parsed trailer_details JSONB here.
  // Omit (or pass undefined) when creating a new listing.
  initialData?: Record<string, unknown>
}

export default function TrailerDetailsForm({ initialData = {} }: TrailerDetailsFormProps) {
  // --- Section 1: Basics ---
  const [assetType, setAssetType] = useState(str(initialData.asset_type))
  const [priceBasis, setPriceBasis] = useState(str(initialData.price_basis) || "Fixed")
  const [vatStatus, setVatStatus] = useState(str(initialData.vat_status))
  const [yearBuilt, setYearBuilt] = useState(numStr(initialData.year_built))
  const [reasonForSale, setReasonForSale] = useState(str(initialData.reason_for_sale))

  // --- Section 2: Vehicle or chassis (van-only) ---
  const [makeModel, setMakeModel] = useState(str(initialData.make_model))
  const [registrationYear, setRegistrationYear] = useState(numStr(initialData.registration_year))
  const [mileage, setMileage] = useState(numStr(initialData.mileage))
  const [fuelType, setFuelType] = useState(str(initialData.fuel_type))
  const [motExpiry, setMotExpiry] = useState(str(initialData.mot_expiry))
  const [ulezCompliant, setUlezCompliant] = useState(str(initialData.ulez_compliant))

  // --- Section 2: Vehicle or chassis (trailer-only) ---
  const [axles, setAxles] = useState(str(initialData.axles))
  const [braked, setBraked] = useState(str(initialData.braked))
  const [hitchType, setHitchType] = useState(str(initialData.hitch_type))
  const [towingLicence, setTowingLicence] = useState(str(initialData.towing_licence))

  // --- Section 2: Always shown ---
  const [vin, setVin] = useState(str(initialData.vin))
  const [grossWeightKg, setGrossWeightKg] = useState(numStr(initialData.gross_weight_kg))
  const [unladenWeightKg, setUnladenWeightKg] = useState(numStr(initialData.unladen_weight_kg))

  // --- Section 3: Size and access ---
  const [externalLengthM, setExternalLengthM] = useState(numStr(initialData.external_length_m))
  const [externalWidthM, setExternalWidthM] = useState(numStr(initialData.external_width_m))
  const [externalHeightM, setExternalHeightM] = useState(numStr(initialData.external_height_m))
  const [internalLengthM, setInternalLengthM] = useState(numStr(initialData.internal_length_m))
  const [hatchCount, setHatchCount] = useState(numStr(initialData.hatch_count))
  const [hatchSide, setHatchSide] = useState(str(initialData.hatch_side))
  const [canopy, setCanopy] = useState(str(initialData.canopy))
  const [accessDoor, setAccessDoor] = useState(str(initialData.access_door))

  // --- Section 4: Power ---
  const [electricalSupply, setElectricalSupply] = useState<string[]>(strArr(initialData.electrical_supply))
  const [generatorIncluded, setGeneratorIncluded] = useState(str(initialData.generator_included))
  const [generatorDetail, setGeneratorDetail] = useState(str(initialData.generator_detail))
  const [electricalCert, setElectricalCert] = useState(str(initialData.electrical_cert))
  const [electricalCertExpiry, setElectricalCertExpiry] = useState(str(initialData.electrical_cert_expiry))
  const [consumerUnitRcd, setConsumerUnitRcd] = useState(str(initialData.consumer_unit_rcd))

  // --- Section 5: Gas ---
  const [gasUsed, setGasUsed] = useState(str(initialData.gas_used))
  const [bottleType, setBottleType] = useState(str(initialData.bottle_type))
  const [bottleCount, setBottleCount] = useState(numStr(initialData.bottle_count))
  const [bottleLockerVented, setBottleLockerVented] = useState(str(initialData.bottle_locker_vented))
  const [gasCert, setGasCert] = useState(str(initialData.gas_cert))
  const [gasCertExpiry, setGasCertExpiry] = useState(str(initialData.gas_cert_expiry))
  const [gasInterlock, setGasInterlock] = useState(str(initialData.gas_interlock))
  const [gasDropoutVents, setGasDropoutVents] = useState(str(initialData.gas_dropout_vents))

  // --- Section 6: Water and hygiene ---
  const [handWashBasin, setHandWashBasin] = useState(str(initialData.hand_wash_basin))
  const [sinkBowls, setSinkBowls] = useState(str(initialData.sink_bowls))
  const [hotWater, setHotWater] = useState(str(initialData.hot_water))
  const [freshWaterLitres, setFreshWaterLitres] = useState(numStr(initialData.fresh_water_litres))
  const [wasteWaterLitres, setWasteWaterLitres] = useState(numStr(initialData.waste_water_litres))
  const [wallFloorFinish, setWallFloorFinish] = useState(str(initialData.wall_floor_finish))
  const [extractionCanopy, setExtractionCanopy] = useState(str(initialData.extraction_canopy))
  const [extractionCondition, setExtractionCondition] = useState(str(initialData.extraction_condition))

  // --- Section 7: Equipment list ---
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(initEquipmentRows(initialData.equipment))
  const [otherItemsIncluded, setOtherItemsIncluded] = useState(str(initialData.other_items_included))

  // --- Section 8: Compliance ---
  const [documentsHeld, setDocumentsHeld] = useState<string[]>(strArr(initialData.documents_held))
  const [foodHygieneRating, setFoodHygieneRating] = useState(str(initialData.food_hygiene_rating))
  const [laRegistered, setLaRegistered] = useState(str(initialData.la_registered))
  const [fireExtinguisher, setFireExtinguisher] = useState(str(initialData.fire_extinguisher))
  const [readyToTrade, setReadyToTrade] = useState(str(initialData.ready_to_trade))
  const [businessIncluded, setBusinessIncluded] = useState(str(initialData.business_included))
  const [pitchDetails, setPitchDetails] = useState(str(initialData.pitch_details))

  // --- Section 9: Viewing and handover ---
  const [viewing, setViewing] = useState(str(initialData.viewing))
  const [deliveryOptionTrailer, setDeliveryOptionTrailer] = useState(str(initialData.delivery_option))
  const [deliveryRadiusMiles, setDeliveryRadiusMiles] = useState(numStr(initialData.delivery_radius_miles))
  const [handoverTraining, setHandoverTraining] = useState(str(initialData.handover_training))
  const [partExchange, setPartExchange] = useState(str(initialData.part_exchange))

  const isVanType = VAN_ASSET_TYPES.includes(assetType)
  const isTrailerType = TRAILER_ASSET_TYPES.includes(assetType)
  const deliveryIncludesRadius =
    deliveryOptionTrailer === "Delivery available buyer pays" ||
    deliveryOptionTrailer === "Delivery included within radius"

  // Build the full trailer_details object from all section state.
  // Only non-empty values are included to keep the JSONB compact.
  function buildTrailerDetails(): Record<string, unknown> {
    const details: Record<string, unknown> = {}

    // Section 1
    if (assetType) details.asset_type = assetType
    if (priceBasis) details.price_basis = priceBasis
    if (vatStatus) details.vat_status = vatStatus
    if (yearBuilt) details.year_built = Number(yearBuilt)
    if (reasonForSale) details.reason_for_sale = reasonForSale

    // Section 2 — van
    if (isVanType) {
      if (makeModel) details.make_model = makeModel
      if (registrationYear) details.registration_year = Number(registrationYear)
      if (mileage) details.mileage = Number(mileage)
      if (fuelType) details.fuel_type = fuelType
      if (motExpiry) details.mot_expiry = motExpiry
      if (ulezCompliant) details.ulez_compliant = ulezCompliant
    }

    // Section 2 — trailer
    if (isTrailerType) {
      if (axles) details.axles = axles
      if (braked) details.braked = braked
      if (hitchType) details.hitch_type = hitchType
      if (towingLicence) details.towing_licence = towingLicence
    }

    // Section 2 — always
    if (vin) details.vin = vin
    if (grossWeightKg) details.gross_weight_kg = Number(grossWeightKg)
    if (unladenWeightKg) details.unladen_weight_kg = Number(unladenWeightKg)

    // Section 3
    if (externalLengthM) details.external_length_m = Number(externalLengthM)
    if (externalWidthM) details.external_width_m = Number(externalWidthM)
    if (externalHeightM) details.external_height_m = Number(externalHeightM)
    if (internalLengthM) details.internal_length_m = Number(internalLengthM)
    if (hatchCount) details.hatch_count = Number(hatchCount)
    if (hatchSide) details.hatch_side = hatchSide
    if (canopy) details.canopy = canopy
    if (accessDoor) details.access_door = accessDoor

    // Section 4
    if (electricalSupply.length > 0) details.electrical_supply = electricalSupply
    if (generatorIncluded) details.generator_included = generatorIncluded
    if (generatorIncluded === "Yes" && generatorDetail) details.generator_detail = generatorDetail
    if (electricalCert) details.electrical_cert = electricalCert
    if (electricalCert === "Current EIC or EICR" && electricalCertExpiry) details.electrical_cert_expiry = electricalCertExpiry
    if (consumerUnitRcd) details.consumer_unit_rcd = consumerUnitRcd

    // Section 5
    if (gasUsed) details.gas_used = gasUsed
    if (gasUsed === "Yes") {
      if (bottleType) details.bottle_type = bottleType
      if (bottleCount) details.bottle_count = Number(bottleCount)
      if (bottleLockerVented) details.bottle_locker_vented = bottleLockerVented
      if (gasCert) details.gas_cert = gasCert
      if (gasCert === "Current" && gasCertExpiry) details.gas_cert_expiry = gasCertExpiry
      if (gasInterlock) details.gas_interlock = gasInterlock
      if (gasDropoutVents) details.gas_dropout_vents = gasDropoutVents
    }

    // Section 6
    if (handWashBasin) details.hand_wash_basin = handWashBasin
    if (sinkBowls) details.sink_bowls = sinkBowls
    if (hotWater) details.hot_water = hotWater
    if (freshWaterLitres) details.fresh_water_litres = Number(freshWaterLitres)
    if (wasteWaterLitres) details.waste_water_litres = Number(wasteWaterLitres)
    if (wallFloorFinish) details.wall_floor_finish = wallFloorFinish
    if (extractionCanopy) details.extraction_canopy = extractionCanopy
    if (extractionCanopy === "Yes" && extractionCondition) details.extraction_condition = extractionCondition

    // Section 7
    if (equipmentRows.length > 0) {
      details.equipment = equipmentRows.map(({ id: _id, ...row }) => row)
    }
    if (otherItemsIncluded) details.other_items_included = otherItemsIncluded

    // Section 8
    if (documentsHeld.length > 0) details.documents_held = documentsHeld
    if (foodHygieneRating) details.food_hygiene_rating = foodHygieneRating
    if (laRegistered) details.la_registered = laRegistered
    if (fireExtinguisher) details.fire_extinguisher = fireExtinguisher
    if (readyToTrade) details.ready_to_trade = readyToTrade
    if (businessIncluded) details.business_included = businessIncluded
    if (businessIncluded === "Yes" && pitchDetails) details.pitch_details = pitchDetails

    // Section 9
    if (viewing) details.viewing = viewing
    if (deliveryOptionTrailer) details.delivery_option = deliveryOptionTrailer
    if (deliveryIncludesRadius && deliveryRadiusMiles) details.delivery_radius_miles = Number(deliveryRadiusMiles)
    if (handoverTraining) details.handover_training = handoverTraining
    if (partExchange) details.part_exchange = partExchange

    return details
  }

  function updateEquipmentRow(id: string, field: keyof EquipmentRow, value: string) {
    setEquipmentRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function removeEquipmentRow(id: string) {
    setEquipmentRows((rows) => rows.filter((r) => r.id !== id))
  }

  return (
    <>
      {/* Hidden input — picked up by new FormData(form) in handlePublish / EditListingForm */}
      <input type="hidden" name="trailer_details" value={JSON.stringify(buildTrailerDetails())} />

      {/* ── SECTION 1: ASSET BASICS ─────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Asset basics" />
        <div className="space-y-4">
          <Field label="Asset type" required>
            <select className={SELECT} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              <option value="">— Select type —</option>
              {["Catering trailer", "Food van", "Horsebox conversion", "Concession unit", "Coffee cart", "Container unit", "Other"].map(
                (opt) => <option key={opt}>{opt}</option>
              )}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className={LABEL}>Price basis {REQ}</p>
              <RadioGroup
                name="_td_price_basis"
                options={["Fixed", "ONO", "POA"]}
                value={priceBasis}
                onChange={setPriceBasis}
              />
            </div>
            <div>
              <p className={LABEL}>VAT status {REQ}</p>
              <RadioGroup
                name="_td_vat_status"
                options={["VAT included", "Plus VAT", "Not VAT registered"]}
                value={vatStatus}
                onChange={setVatStatus}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Year built" required>
              <input
                type="number"
                className={INPUT}
                placeholder="e.g. 2018"
                min={1970}
                max={new Date().getFullYear() + 1}
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
              />
            </Field>
            <Field label="Reason for sale">
              <input
                type="text"
                className={INPUT}
                placeholder="e.g. Upgrading to a larger unit"
                value={reasonForSale}
                onChange={(e) => setReasonForSale(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: VEHICLE OR CHASSIS ───────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Vehicle or chassis" />
        <div className="space-y-4">

          {/* Van-only fields */}
          {isVanType && (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Vehicle details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Make and model">
                  <input type="text" className={INPUT} placeholder="e.g. Ford Transit Custom" value={makeModel} onChange={(e) => setMakeModel(e.target.value)} />
                </Field>
                <Field label="Registration year">
                  <input type="number" className={INPUT} placeholder="e.g. 2019" min={1970} max={new Date().getFullYear() + 1} value={registrationYear} onChange={(e) => setRegistrationYear(e.target.value)} />
                </Field>
                <Field label="Mileage">
                  <input type="number" className={INPUT} placeholder="e.g. 45000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                </Field>
                <div>
                  <p className={LABEL}>Fuel type</p>
                  <RadioGroup name="_td_fuel_type" options={["Diesel", "Petrol", "Electric", "Hybrid"]} value={fuelType} onChange={setFuelType} />
                </div>
                <Field label="MOT expiry date">
                  <input type="date" className={INPUT} value={motExpiry} onChange={(e) => setMotExpiry(e.target.value)} />
                </Field>
                <div>
                  <p className={LABEL}>ULEZ compliant</p>
                  <RadioGroup name="_td_ulez" options={["Yes", "No", "Unsure"]} value={ulezCompliant} onChange={setUlezCompliant} />
                </div>
              </div>
            </div>
          )}

          {/* Trailer-only fields */}
          {isTrailerType && (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Trailer details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={LABEL}>Axles</p>
                  <RadioGroup name="_td_axles" options={["Single", "Twin", "Tri"]} value={axles} onChange={setAxles} />
                </div>
                <div>
                  <p className={LABEL}>Braked</p>
                  <RadioGroup name="_td_braked" options={["Yes", "No"]} value={braked} onChange={setBraked} />
                </div>
                <div>
                  <p className={LABEL}>Hitch type</p>
                  <RadioGroup name="_td_hitch" options={["50mm ball", "Ring", "Other"]} value={hitchType} onChange={setHitchType} />
                </div>
                <div>
                  <p className={LABEL}>Towing licence required</p>
                  <RadioGroup name="_td_towing" options={["B", "B+E", "Unsure"]} value={towingLicence} onChange={setTowingLicence} />
                </div>
              </div>
            </div>
          )}

          {/* Always-shown chassis fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="VIN / chassis number" required>
              <input type="text" className={INPUT} placeholder="17-character VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
            </Field>
            <Field label="Gross weight (kg)" required>
              <input type="number" className={INPUT} placeholder="e.g. 3500" value={grossWeightKg} onChange={(e) => setGrossWeightKg(e.target.value)} />
            </Field>
            <Field label="Unladen weight (kg)" required>
              <input type="number" className={INPUT} placeholder="e.g. 1800" value={unladenWeightKg} onChange={(e) => setUnladenWeightKg(e.target.value)} />
            </Field>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: SIZE AND ACCESS ──────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Size and access" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="External length (m)" required>
              <input type="number" step="0.01" className={INPUT} placeholder="e.g. 5.5" value={externalLengthM} onChange={(e) => setExternalLengthM(e.target.value)} />
            </Field>
            <Field label="External width (m)" required>
              <input type="number" step="0.01" className={INPUT} placeholder="e.g. 2.1" value={externalWidthM} onChange={(e) => setExternalWidthM(e.target.value)} />
            </Field>
            <Field label="External height (m)" required>
              <input type="number" step="0.01" className={INPUT} placeholder="e.g. 2.8" value={externalHeightM} onChange={(e) => setExternalHeightM(e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Internal length (m)">
              <input type="number" step="0.01" className={INPUT} placeholder="e.g. 4.8" value={internalLengthM} onChange={(e) => setInternalLengthM(e.target.value)} />
            </Field>
            <Field label="Number of hatches" required>
              <input type="number" className={INPUT} placeholder="e.g. 2" min={0} value={hatchCount} onChange={(e) => setHatchCount(e.target.value)} />
            </Field>
            <div>
              <p className={LABEL}>Hatch side {REQ}</p>
              <RadioGroup
                name="_td_hatch_side"
                options={["Nearside", "Offside", "Rear", "Multiple"]}
                value={hatchSide}
                onChange={setHatchSide}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Canopy</p>
              <RadioGroup name="_td_canopy" options={["Yes", "No"]} value={canopy} onChange={setCanopy} />
            </div>
            <div>
              <p className={LABEL}>Access door</p>
              <RadioGroup name="_td_access_door" options={["Rear", "Side", "Front", "None"]} value={accessDoor} onChange={setAccessDoor} />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: POWER ────────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Electrical" />
        <div className="space-y-4">
          <div>
            <p className={LABEL}>Electrical supply (select all that apply)</p>
            <CheckboxGroup options={ELECTRICAL_SUPPLY_OPTIONS} selected={electricalSupply} onChange={setElectricalSupply} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Generator included</p>
              <RadioGroup name="_td_generator" options={["Yes", "No"]} value={generatorIncluded} onChange={setGeneratorIncluded} />
            </div>
            {generatorIncluded === "Yes" && (
              <Field label="Generator details">
                <input type="text" className={INPUT} placeholder="e.g. Honda 3kW petrol, 120hrs" value={generatorDetail} onChange={(e) => setGeneratorDetail(e.target.value)} />
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Electrical certificate</p>
              <RadioGroup name="_td_elec_cert" options={["Current EIC or EICR", "Expired", "None"]} value={electricalCert} onChange={setElectricalCert} />
            </div>
            {electricalCert === "Current EIC or EICR" && (
              <Field label="Certificate expiry date">
                <input type="date" className={INPUT} value={electricalCertExpiry} onChange={(e) => setElectricalCertExpiry(e.target.value)} />
              </Field>
            )}
          </div>

          <div>
            <p className={LABEL}>Consumer unit has RCD protection</p>
            <RadioGroup name="_td_rcd" options={["Yes", "No"]} value={consumerUnitRcd} onChange={setConsumerUnitRcd} />
          </div>
        </div>
      </section>

      {/* ── SECTION 5: GAS ──────────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Gas" />
        <div className="space-y-4">
          <div>
            <p className={LABEL}>Gas used in this unit</p>
            <RadioGroup name="_td_gas_used" options={["Yes", "No"]} value={gasUsed} onChange={setGasUsed} />
          </div>

          {gasUsed === "Yes" && (
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className={LABEL}>Bottle type</p>
                  <RadioGroup name="_td_bottle_type" options={["13kg propane", "19kg", "47kg"]} value={bottleType} onChange={setBottleType} />
                </div>
                <Field label="Number of bottles">
                  <input type="number" className={INPUT} placeholder="e.g. 2" min={1} value={bottleCount} onChange={(e) => setBottleCount(e.target.value)} />
                </Field>
                <div>
                  <p className={LABEL}>Bottle locker vented</p>
                  <RadioGroup name="_td_locker" options={["Yes", "No"]} value={bottleLockerVented} onChange={setBottleLockerVented} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={LABEL}>Gas safety certificate</p>
                  <RadioGroup name="_td_gas_cert" options={["Current", "Expired", "None"]} value={gasCert} onChange={setGasCert} />
                </div>
                {gasCert === "Current" && (
                  <Field label="Certificate expiry date">
                    <input type="date" className={INPUT} value={gasCertExpiry} onChange={(e) => setGasCertExpiry(e.target.value)} />
                  </Field>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={LABEL}>Gas interlock fitted</p>
                  <RadioGroup name="_td_gas_interlock" options={["Yes", "No", "Unsure"]} value={gasInterlock} onChange={setGasInterlock} />
                </div>
                <div>
                  <p className={LABEL}>Gas drop-out vents fitted</p>
                  <RadioGroup name="_td_dropout" options={["Yes", "No"]} value={gasDropoutVents} onChange={setGasDropoutVents} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 6: WATER AND HYGIENE ────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Water and hygiene" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className={LABEL}>Hand wash basin</p>
              <RadioGroup name="_td_hwb" options={["Yes", "No"]} value={handWashBasin} onChange={setHandWashBasin} />
            </div>
            <div>
              <p className={LABEL}>Sink bowls</p>
              <RadioGroup name="_td_sinks" options={["1", "2", "3+"]} value={sinkBowls} onChange={setSinkBowls} />
            </div>
            <div>
              <p className={LABEL}>Hot water</p>
              <RadioGroup
                name="_td_hot_water"
                options={["Instant electric", "Gas water heater", "Urn only", "None"]}
                value={hotWater}
                onChange={setHotWater}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fresh water capacity (litres)">
              <input type="number" className={INPUT} placeholder="e.g. 100" value={freshWaterLitres} onChange={(e) => setFreshWaterLitres(e.target.value)} />
            </Field>
            <Field label="Waste water capacity (litres)">
              <input type="number" className={INPUT} placeholder="e.g. 100" value={wasteWaterLitres} onChange={(e) => setWasteWaterLitres(e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Wall and floor finish</p>
              <RadioGroup name="_td_finish" options={["Stainless", "Hygienic cladding", "Ply", "Mixed"]} value={wallFloorFinish} onChange={setWallFloorFinish} />
            </div>
            <div>
              <p className={LABEL}>Extraction canopy</p>
              <RadioGroup name="_td_extraction" options={["Yes", "No"]} value={extractionCanopy} onChange={setExtractionCanopy} />
            </div>
          </div>

          {extractionCanopy === "Yes" && (
            <div>
              <p className={LABEL}>Extraction condition</p>
              <RadioGroup
                name="_td_extraction_condition"
                options={["Fitted and working", "Fitted needs service", "None"]}
                value={extractionCondition}
                onChange={setExtractionCondition}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 7: EQUIPMENT LIST ────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Equipment list" />

        {/*
          CATERBOT PLACEHOLDER — Section 7 only
          ------------------------------------------------------------------
          CaterBot spec lookup (brand + model → specs) is not currently
          wired to equipment rows in the trailer form. To add it:
          1. Add a "Look up specs" button per row that calls
             /api/caterbot/spec-lookup with { brand, model }.
          2. On success, pre-fill make_model and condition from the response.
          3. Keep the callback scoped to this row only.
          Gas, electrical, weight, VIN and compliance fields must remain
          seller-entered and must NOT be touched by CaterBot.
          ------------------------------------------------------------------
        */}

        <datalist id="trailer-equipment-suggestions">
          {EQUIPMENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>

        <div className="space-y-3">
          {equipmentRows.map((row, index) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Item {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeEquipmentRow(row.id)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-500 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Item">
                  <input
                    type="text"
                    list="trailer-equipment-suggestions"
                    className={INPUT}
                    placeholder="e.g. fryer"
                    value={row.item}
                    onChange={(e) => updateEquipmentRow(row.id, "item", e.target.value)}
                  />
                </Field>
                <Field label="Make / model">
                  <input
                    type="text"
                    className={INPUT}
                    placeholder="e.g. Falcon E3860"
                    value={row.make_model}
                    onChange={(e) => updateEquipmentRow(row.id, "make_model", e.target.value)}
                  />
                </Field>
                <div>
                  <p className={LABEL}>Power source</p>
                  <RadioGroup
                    name={`_td_eq_power_${row.id}`}
                    options={["Gas", "Electric", "Dual"]}
                    value={row.power_source}
                    onChange={(v) => updateEquipmentRow(row.id, "power_source", v)}
                  />
                </div>
                <div>
                  <p className={LABEL}>Condition</p>
                  <RadioGroup
                    name={`_td_eq_cond_${row.id}`}
                    options={["Working", "Working needs service", "Not working", "Spares"]}
                    value={row.condition}
                    onChange={(v) => updateEquipmentRow(row.id, "condition", v)}
                  />
                </div>
                <div>
                  <p className={LABEL}>Included in sale</p>
                  <RadioGroup
                    name={`_td_eq_inc_${row.id}`}
                    options={["Yes", "No"]}
                    value={row.included}
                    onChange={(v) => updateEquipmentRow(row.id, "included", v)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setEquipmentRows((rows) => [...rows, newEquipmentRow()])}
            className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-black text-[#002E5D] hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5"
          >
            + Add equipment item
          </button>
        </div>

        <div className="mt-4">
          <Field label="Other items included">
            <textarea
              className={INPUT}
              rows={2}
              placeholder="Any other items, stock or accessories included in the sale"
              value={otherItemsIncluded}
              onChange={(e) => setOtherItemsIncluded(e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ── SECTION 8: COMPLIANCE ────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Compliance and documents" />
        <div className="space-y-4">
          <div>
            <p className={LABEL}>Documents held (select all that apply)</p>
            <CheckboxGroup options={DOCUMENTS_OPTIONS} selected={documentsHeld} onChange={setDocumentsHeld} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Food hygiene rating</p>
              <RadioGroup name="_td_fhrs" options={["5", "4", "3", "Lower", "Not registered"]} value={foodHygieneRating} onChange={setFoodHygieneRating} />
            </div>
            <div>
              <p className={LABEL}>Registered with local authority</p>
              <RadioGroup name="_td_la" options={["Yes", "No"]} value={laRegistered} onChange={setLaRegistered} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Fire extinguisher on board</p>
              <RadioGroup name="_td_fire_ext" options={["Yes", "No"]} value={fireExtinguisher} onChange={setFireExtinguisher} />
            </div>
            <div>
              <p className={LABEL}>Ready to trade {REQ}</p>
              <RadioGroup name="_td_ready" options={["Yes", "Needs work", "Shell only"]} value={readyToTrade} onChange={setReadyToTrade} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Established business included</p>
              <RadioGroup name="_td_biz" options={["Yes", "No"]} value={businessIncluded} onChange={setBusinessIncluded} />
            </div>
            {businessIncluded === "Yes" && (
              <Field label="Pitch or trading location details">
                <textarea
                  className={INPUT}
                  rows={2}
                  placeholder="e.g. Weekly pitch at Exeter market, Sundays"
                  value={pitchDetails}
                  onChange={(e) => setPitchDetails(e.target.value)}
                />
              </Field>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 9: VIEWING AND HANDOVER ─────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeading title="Viewing and handover" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Viewing</p>
              <RadioGroup
                name="_td_viewing"
                options={["By appointment", "Anytime", "Video call available"]}
                value={viewing}
                onChange={setViewing}
              />
            </div>
            <div>
              <p className={LABEL}>Delivery option</p>
              <RadioGroup
                name="_td_delivery"
                options={["Collection only", "Delivery available buyer pays", "Delivery included within radius"]}
                value={deliveryOptionTrailer}
                onChange={setDeliveryOptionTrailer}
              />
            </div>
          </div>

          {deliveryIncludesRadius && (
            <Field label="Delivery radius (miles)">
              <input
                type="number"
                className={INPUT}
                placeholder="e.g. 50"
                value={deliveryRadiusMiles}
                onChange={(e) => setDeliveryRadiusMiles(e.target.value)}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={LABEL}>Handover training included</p>
              <RadioGroup name="_td_training" options={["Yes", "No"]} value={handoverTraining} onChange={setHandoverTraining} />
            </div>
            <div>
              <p className={LABEL}>Part exchange considered</p>
              <RadioGroup name="_td_px" options={["Yes", "No"]} value={partExchange} onChange={setPartExchange} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
