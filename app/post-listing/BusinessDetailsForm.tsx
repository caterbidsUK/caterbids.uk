"use client"

import { useState } from "react"

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}
function numStr(v: unknown): string {
  if (typeof v === "number") return String(v)
  if (typeof v === "string") return v
  return ""
}

const BUSINESS_TYPES = [
  "Café",
  "Takeaway",
  "Restaurant",
  "Coffee Shop",
  "Food Van Business",
  "Commercial Kitchen",
  "Pub / Bar",
  "Hotel / B&B",
  "Event Catering",
  "Other",
]

const PREMISES_TYPES = [
  "Permanent unit",
  "Market stall",
  "Kiosk",
  "Shared kitchen",
  "Pop-up",
  "Industrial unit",
  "Other",
]

const LOCATION_TYPES = [
  "High street",
  "Retail park",
  "Food court / market",
  "Industrial estate",
  "Rural / roadside",
  "Online only",
  "Other",
]

const TRADING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

const LICENSING_OPTIONS = [
  "Alcohol licence",
  "Late night licence",
  "Street trading licence",
  "5-star food hygiene",
  "None",
]

const RENT_OWN_OPTIONS = ["Rented", "Owned", "Licence to occupy"]
const YES_NO = ["Yes", "No"]
const YES_SOME_NO = ["Yes", "Some", "No"]

const INPUT =
  "w-full rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
const SELECT = INPUT
const LABEL = "mb-1 block text-sm font-black text-white"
const REQ = <span className="text-[#FF6B00]">*</span>
const SECTION =
  "rounded-[1.6rem] border border-white/14 bg-[#061f3d]/86 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6"

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-4 text-2xl font-black tracking-[-0.035em]">{title}</h2>
}

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
              : "border-white/20 bg-white/[0.06] text-white/80 hover:border-[#FF6B00]/40"
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
              : "border-white/20 bg-white/[0.06] text-white/80 hover:border-[#FF6B00]/40"
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

interface BusinessDetailsFormProps {
  initialData?: Record<string, unknown>
  initialIsConfidential?: boolean
}

export default function BusinessDetailsForm({
  initialData = {},
  initialIsConfidential = false,
}: BusinessDetailsFormProps) {
  // is_confidential is a real DB column — submitted as its own hidden field
  const [isConfidential, setIsConfidential] = useState(initialIsConfidential)

  // Section 1: Basics
  const [tradingName, setTradingName] = useState(str(initialData.trading_name))
  const [businessType, setBusinessType] = useState(str(initialData.business_type))
  const [yearsTrading, setYearsTrading] = useState(numStr(initialData.years_trading))
  const [reasonForSale, setReasonForSale] = useState(str(initialData.reason_for_sale))

  // Section 2: Financials
  const [annualTurnover, setAnnualTurnover] = useState(str(initialData.annual_turnover))
  const [annualProfit, setAnnualProfit] = useState(str(initialData.annual_profit))
  const [avgWeeklyRevenue, setAvgWeeklyRevenue] = useState(str(initialData.avg_weekly_revenue))
  const [rentOrOwn, setRentOrOwn] = useState(str(initialData.rent_or_own))
  const [monthlyRent, setMonthlyRent] = useState(str(initialData.monthly_rent))
  const [leaseRemaining, setLeaseRemaining] = useState(str(initialData.lease_remaining))

  // Section 3: Property
  const [premisesType, setPremisesType] = useState(str(initialData.premises_type))
  const [premisesDescription, setPremisesDescription] = useState(str(initialData.premises_description))
  const [sqFt, setSqFt] = useState(numStr(initialData.sq_ft))
  const [covers, setCovers] = useState(numStr(initialData.covers))
  const [locationType, setLocationType] = useState(str(initialData.location_type))
  const [postcode, setPostcode] = useState(str(initialData.postcode))

  // Section 4: Operation
  const [staffCount, setStaffCount] = useState(numStr(initialData.staff_count))
  const [openingHours, setOpeningHours] = useState(str(initialData.opening_hours))
  const [tradingDays, setTradingDays] = useState<string[]>(strArr(initialData.trading_days))
  const [cuisineType, setCuisineType] = useState(str(initialData.cuisine_type))
  const [licensing, setLicensing] = useState<string[]>(strArr(initialData.licensing))

  // Section 5: What is included
  const [equipmentIncluded, setEquipmentIncluded] = useState(str(initialData.equipment_included))
  const [stockIncluded, setStockIncluded] = useState(str(initialData.stock_included))
  const [websiteSocialIncluded, setWebsiteSocialIncluded] = useState(
    str(initialData.website_social_included)
  )
  const [supplierContacts, setSupplierContacts] = useState(str(initialData.supplier_contacts))
  const [trainingOffered, setTrainingOffered] = useState(str(initialData.training_offered))
  const [otherInclusions, setOtherInclusions] = useState(str(initialData.other_inclusions))

  function buildBusinessDetails(): Record<string, unknown> {
    return {
      trading_name: tradingName || null,
      business_type: businessType || null,
      years_trading: yearsTrading ? Number(yearsTrading) : null,
      reason_for_sale: reasonForSale || null,
      annual_turnover: annualTurnover || null,
      annual_profit: annualProfit || null,
      avg_weekly_revenue: avgWeeklyRevenue || null,
      rent_or_own: rentOrOwn || null,
      monthly_rent: monthlyRent || null,
      lease_remaining: leaseRemaining || null,
      premises_type: premisesType || null,
      premises_description: premisesDescription || null,
      sq_ft: sqFt ? Number(sqFt) : null,
      covers: covers ? Number(covers) : null,
      location_type: locationType || null,
      postcode: postcode || null,
      staff_count: staffCount ? Number(staffCount) : null,
      opening_hours: openingHours || null,
      trading_days: tradingDays.length > 0 ? tradingDays : null,
      cuisine_type: cuisineType || null,
      licensing: licensing.length > 0 ? licensing : null,
      equipment_included: equipmentIncluded || null,
      stock_included: stockIncluded || null,
      website_social_included: websiteSocialIncluded || null,
      supplier_contacts: supplierContacts || null,
      training_offered: trainingOffered || null,
      other_inclusions: otherInclusions || null,
    }
  }

  return (
    <div className="space-y-5">
      {/* Confidentiality toggle */}
      <section className={SECTION}>
        <SectionHeading title="Business confidentiality" />
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 cursor-pointer accent-[#FF6B00]"
            checked={isConfidential}
            onChange={(e) => setIsConfidential(e.target.checked)}
          />
          <div>
            <p className="text-sm font-black">Keep this listing confidential</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
              Your trading name, full address and postcode will be hidden from public listings.
              Buyers will only see the business type and general town. Enquirers receive details
              after contacting you.
            </p>
          </div>
        </label>
        {isConfidential && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            <span className="font-black">Your listing title is public.</span> Do not put your business
            name or street address in it. Try something like:{" "}
            <span className="italic">Established cafe for sale, south Manchester.</span>
          </div>
        )}
      </section>

      {/* Section 1: Basics */}
      <section className={SECTION}>
        <SectionHeading title="Business basics" />
        <div className="space-y-4">
          <Field label="Trading name">
            <input
              type="text"
              className={INPUT}
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              placeholder="e.g. The Coffee Hut"
            />
          </Field>
          {isConfidential && tradingName && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
              Trading name will be hidden from public listings.
            </p>
          )}

          <Field label="Business type" required>
            <select
              className={SELECT}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              <option value="">— Select —</option>
              {BUSINESS_TYPES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years trading">
              <input
                type="number"
                min="0"
                className={INPUT}
                value={yearsTrading}
                onChange={(e) => setYearsTrading(e.target.value)}
                placeholder="e.g. 5"
              />
            </Field>
            <Field label="Reason for sale">
              <input
                type="text"
                className={INPUT}
                value={reasonForSale}
                onChange={(e) => setReasonForSale(e.target.value)}
                placeholder="e.g. Retirement"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Section 2: Financials */}
      <section className={SECTION}>
        <SectionHeading title="Financials" />
        <p className="mb-4 text-xs font-semibold text-white/55">
          Leave blank if you prefer not to disclose — financial details help buyers make a decision.
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Annual turnover">
              <input
                type="text"
                className={INPUT}
                value={annualTurnover}
                onChange={(e) => setAnnualTurnover(e.target.value)}
                placeholder="e.g. £150,000"
              />
            </Field>
            <Field label="Annual profit">
              <input
                type="text"
                className={INPUT}
                value={annualProfit}
                onChange={(e) => setAnnualProfit(e.target.value)}
                placeholder="e.g. £30,000"
              />
            </Field>
            <Field label="Avg. weekly revenue">
              <input
                type="text"
                className={INPUT}
                value={avgWeeklyRevenue}
                onChange={(e) => setAvgWeeklyRevenue(e.target.value)}
                placeholder="e.g. £3,000"
              />
            </Field>
          </div>

          <div>
            <p className={LABEL}>Premises ownership</p>
            <RadioGroup
              name="rent_or_own_display"
              options={RENT_OWN_OPTIONS}
              value={rentOrOwn}
              onChange={setRentOrOwn}
            />
          </div>

          {rentOrOwn === "Rented" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monthly rent">
                <input
                  type="text"
                  className={INPUT}
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  placeholder="e.g. £2,500/month"
                />
              </Field>
              <Field label="Lease remaining">
                <input
                  type="text"
                  className={INPUT}
                  value={leaseRemaining}
                  onChange={(e) => setLeaseRemaining(e.target.value)}
                  placeholder="e.g. 3 years"
                />
              </Field>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Property */}
      <section className={SECTION}>
        <SectionHeading title="Property" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Premises type">
              <select
                className={SELECT}
                value={premisesType}
                onChange={(e) => setPremisesType(e.target.value)}
              >
                <option value="">— Select —</option>
                {PREMISES_TYPES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Location type">
              <select
                className={SELECT}
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                <option value="">— Select —</option>
                {LOCATION_TYPES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Premises description">
            <textarea
              className={INPUT}
              rows={3}
              value={premisesDescription}
              onChange={(e) => setPremisesDescription(e.target.value)}
              placeholder="e.g. Ground floor unit with seating and full commercial kitchen"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Floor area (sq ft)">
              <input
                type="number"
                min="0"
                className={INPUT}
                value={sqFt}
                onChange={(e) => setSqFt(e.target.value)}
                placeholder="e.g. 800"
              />
            </Field>
            <Field label="Covers / seats">
              <input
                type="number"
                min="0"
                className={INPUT}
                value={covers}
                onChange={(e) => setCovers(e.target.value)}
                placeholder="e.g. 40"
              />
            </Field>
            <Field label="Postcode">
              <input
                type="text"
                className={INPUT}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder={isConfidential ? "Hidden from public" : "e.g. M1 1AE"}
              />
            </Field>
          </div>

          {isConfidential && postcode && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
              Postcode will be hidden from public listings.
            </p>
          )}
        </div>
      </section>

      {/* Section 4: Operation */}
      <section className={SECTION}>
        <SectionHeading title="Operation" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Number of staff">
              <input
                type="number"
                min="0"
                className={INPUT}
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
                placeholder="e.g. 4"
              />
            </Field>
            <Field label="Cuisine type">
              <input
                type="text"
                className={INPUT}
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                placeholder="e.g. Pizza, Coffee, Street food"
              />
            </Field>
          </div>

          <Field label="Opening hours">
            <input
              type="text"
              className={INPUT}
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. Mon–Fri 7am–5pm, Sat 9am–3pm"
            />
          </Field>

          <div>
            <p className={LABEL}>Trading days</p>
            <CheckboxGroup
              options={TRADING_DAYS}
              selected={tradingDays}
              onChange={setTradingDays}
            />
          </div>

          <div>
            <p className={LABEL}>Licences held</p>
            <CheckboxGroup
              options={LICENSING_OPTIONS}
              selected={licensing}
              onChange={setLicensing}
            />
          </div>
        </div>
      </section>

      {/* Section 5: What is included */}
      <section className={SECTION}>
        <SectionHeading title="What is included" />
        <div className="space-y-5">
          {(
            [
              {
                label: "Catering equipment",
                value: equipmentIncluded,
                setter: setEquipmentIncluded,
                opts: YES_SOME_NO,
              },
              {
                label: "Stock",
                value: stockIncluded,
                setter: setStockIncluded,
                opts: YES_SOME_NO,
              },
              {
                label: "Website and social media",
                value: websiteSocialIncluded,
                setter: setWebsiteSocialIncluded,
                opts: YES_NO,
              },
              {
                label: "Supplier contacts",
                value: supplierContacts,
                setter: setSupplierContacts,
                opts: YES_NO,
              },
              {
                label: "Handover training",
                value: trainingOffered,
                setter: setTrainingOffered,
                opts: YES_NO,
              },
            ] as { label: string; value: string; setter: (v: string) => void; opts: string[] }[]
          ).map(({ label, value, setter, opts }) => (
            <div key={label}>
              <p className={LABEL}>{label}</p>
              <RadioGroup
                name={`incl_${label.toLowerCase().replace(/[\s/]+/g, "_")}`}
                options={opts}
                value={value}
                onChange={setter}
              />
            </div>
          ))}

          <Field label="Other inclusions">
            <textarea
              className={INPUT}
              rows={3}
              value={otherInclusions}
              onChange={(e) => setOtherInclusions(e.target.value)}
              placeholder="e.g. POS system, loyalty scheme database, branded packaging stock"
            />
          </Field>
        </div>
      </section>

      {/* Hidden inputs — picked up by new FormData(form) in handlePublish */}
      <input
        type="hidden"
        name="business_details"
        value={JSON.stringify(buildBusinessDetails())}
      />
      {/* is_confidential is a real DB column, not part of JSONB */}
      <input
        type="hidden"
        name="is_confidential"
        value={isConfidential ? "true" : "false"}
      />
    </div>
  )
}
