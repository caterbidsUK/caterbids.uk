import {
  buildCaterBotSourceQueries,
  buildModelSearchVariants,
  manufacturerDomainForBrand,
  searchCaterBotSources,
} from "@/lib/caterbot/webSearch"
import {
  sourcePriorityRank,
  validateCaterBotProductSource,
  type CaterBotSourceValidationResult,
} from "@/lib/caterbot/sourceValidation"

export type CaterBotSpecExtraction = {
  raw_text: string
  brand_candidates: string[]
  model_candidates: string[]
  serial_candidates: string[]
  equipment_type_candidates: string[]
  power_details: string[]
  refrigerant_details: string[]
  brand: string
  model: string
  product_name: string
  serial: string
  equipment_type: string
  power: string
  gas_type: string
  gas_connection: string
  heat_input_kw: number | null
  refrigerant: string
  frequency: string
  confidence: number
}

export type CaterBotStructuredSpecs = {
  title: string
  category: string
  type: string
  condition: string
  brand: string
  model: string
  weight_kg: number | null
  height_cm: number | null
  width_cm: number | null
  depth_cm: number | null
  net_weight_kg: number | null
  gross_weight_kg: number | null
  capacity_litres: number | null
  power_type: string
  voltage: string
  phase: string
  watts: number | null
  amps: number | null
  gas_type: string
  gas_connection: string
  heat_input_kw: number | null
  refrigerant: string
  refrigerant_mass: string
  frequency: string
  power_details: string
  short_description: string
  safety_note: string
  pallet_required: boolean
  suggested_pallet_size: string
  delivery_notes: string
}

const KNOWN_BRANDS = [
  "Bravilor Bonamat",
  "Bravilor",
  "Bonamat",
  "Polar",
  "Lincat",
  "Rational",
  "Falcon",
  "Blue Seal",
  "Buffalo",
  "Hoshizaki",
  "Foster",
  "Williams",
  "Gram",
  "True",
  "Hobart",
  "Hatco",
  "Tecnodom S.P.A.",
  "Tecnodom",
  "Imperial",
  "Archway",
  "Winterhalter",
  "Electrolux",
  "Parry",
  "Moffat",
  "Merrychef",
  "Infernus",
  "Inomak",
  "Classeq",
  "Maidaid",
  "Robot Coupe",
  "Sammic",
  "Sirman",
  "Sharp",
]

function cleanText(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim()
    : ""
}

function cleanSpecValue(value: unknown) {
  const text = cleanText(value)
  return /needs\s+seller\s+check|not\s+available|unknown/i.test(text) ? "" : text
}

function unique(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function titleCaseBrand(value: string) {
  const known = KNOWN_BRANDS.find((brand) => brand.toLowerCase() === value.toLowerCase())
  if (known) return known
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .trim()
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function normaliseCaterBotModel(rawText: string, visualContext?: string | null) {
  const text = cleanText([rawText, visualContext].filter(Boolean).join(" "))
  const compactText = compact(text).toUpperCase()
  const modelCandidates: string[] = []
  const brandCandidates: string[] = []
  const searchTerms: string[] = []
  const equipmentCandidates: string[] = []
  let canonicalBrand = ""
  let canonicalModel = ""
  let productName = ""

  const addModel = (value: string) => {
    const cleaned = cleanText(value).toUpperCase().replace(/\s*\/\s*/g, "/").replace(/\s*-\s*/g, "-")
    if (cleaned) modelCandidates.push(cleaned)
  }
  const addBrand = (value: string) => {
    const cleaned = titleCaseBrand(cleanText(value))
    if (cleaned) brandCandidates.push(cleaned)
  }
  const addSearch = (value: string) => {
    const cleaned = cleanText(value)
    if (cleaned) searchTerms.push(cleaned)
  }
  const addEquipment = (value: string) => {
    const cleaned = cleanText(value)
    if (cleaned) equipmentCandidates.push(cleaned)
  }

  const b10Match = text.match(/\b(?:VHH\s*)?(B10\s*HW(?:[-\s/]?\d{2,4})?|B10HW[-\s/]?\d{2,4}|B10HW)\b/i)
  if (b10Match || /\bB10HW(?:024)?\b/i.test(compactText)) {
    canonicalBrand = "Bravilor Bonamat"
    canonicalModel = "B10 HW"
    productName = "Bravilor Bonamat B10 HW 2 x 10L Bulk Brew Coffee Machine & Hot Water Dispenser"
    addBrand("Bravilor Bonamat")
    addBrand("Bravilor")
    addModel(b10Match?.[1] || "B10HW-024")
    addModel("B10 HW")
    addModel("B10HW")
    addSearch("B10HW-024")
    addSearch("B10 HW")
    addSearch("Bravilor B10 HW")
    addSearch("Bravilor Bonamat B10 HW")
    addSearch("B10 HW 2 x 10L")
    addSearch("bulk brew coffee machine hot water dispenser")
    addEquipment("bulk brew coffee machine and hot water dispenser")
  }

  if (/\bSWU\s*20\s*L\b/i.test(text) || /\bSWU20L\b/i.test(compactText)) {
    canonicalBrand ||= "Swan"
    canonicalModel ||= "SWU20L"
    productName ||= "Swan SWU20L Bulk Brew Coffee Machine and Hot Water Dispenser"
    addBrand("Swan")
    addModel("SWU20L")
    addModel("SWU 20L")
    addSearch("Swan SWU20L")
    addSearch("Swan SWU20L bulk brew coffee machine")
    addSearch("Swan 20L hot water dispenser 2200W")
    addSearch("SWU20L 3860g 2200W")
    addEquipment("bulk brew coffee machine and hot water dispenser")
  }

  if (/\bU\s*632\b/i.test(text) || /\bU632\b/i.test(compactText)) {
    canonicalBrand ||= "Polar"
    canonicalModel ||= "U632"
    productName ||= "Polar U632 U-Series Single Door Upright Fridge 650L"
    addBrand("Polar")
    addModel("U632")
    addSearch("Polar U632")
    addSearch("Polar U-Series U632")
    addSearch("Polar U632 upright fridge 650L")
    addEquipment("upright fridge")
  }

  if (/\b4B\s*STD\b/i.test(text) || /\b4BSTD\b/i.test(compactText)) {
    canonicalBrand ||= "Archway"
    canonicalModel ||= /\/\s*NG|[-\s]NG\b/i.test(text) ? "4B STD / NG" : "4B STD"
    productName ||= "Archway 4B STD / NG Natural Gas 4 Burner Doner Kebab Grill"
    addBrand("Archway")
    addModel("4B STD / NG")
    addModel("4B STD")
    addSearch("Archway 4B STD NG")
    addSearch("Archway 4 burner gas doner kebab grill")
    addSearch("Archway 4B STD natural gas")
    addEquipment("gas doner kebab machine")
  }

  if (/\bEHT8\s*G\b/i.test(text) || /\bEHT8G\b/i.test(compactText) || /\b505103\b/.test(text)) {
    canonicalBrand ||= "Electrolux Professional"
    canonicalModel ||= "EHT8G"
    productName ||= "Electrolux Professional green&clean EHT8G Hood Type Passthrough Dishwasher"
    addBrand("Electrolux Professional")
    addBrand("Electrolux")
    addModel("EHT8G")
    addSearch("Electrolux Professional EHT8G")
    addSearch("Electrolux EHT8G 505103")
    addSearch("9CGX505103")
    addSearch("505103")
    addSearch("green&clean hood type dishwasher")
    addSearch("pass-through commercial dishwasher")
    addEquipment("hood type passthrough dishwasher")
  }

  if (/\bTQ[-\s]?805\b/i.test(text) || /\bTQ805\b/i.test(compactText) || /\bTOAST[-\s]?QWIK\b/i.test(text)) {
    canonicalBrand ||= "Hatco"
    canonicalModel ||= "TQ-805"
    productName ||= "Hatco Toast-Qwik TQ-805 Electric Conveyor Toaster"
    addBrand("Hatco")
    addModel("TQ-805")
    addModel("TQ805")
    addSearch("Hatco TQ-805")
    addSearch("Hatco Toast-Qwik TQ-805")
    addSearch("Toast-Qwik Electric Conveyor Toaster TQ-805")
    addSearch("Hatco TQ-805 conveyor toaster")
    addSearch("TQ-805 3330W 230V")
    addEquipment("electric conveyor toaster")
  }

  if (/\bATT\s*0?3(?:[_\-\s/]?TH)?\b/i.test(text) || /\bATTO3(?:[_\-\s/]?TH)?\b/i.test(text) || /\bATT03TH\b/i.test(compactText)) {
    canonicalBrand ||= "Tecnodom S.P.A."
    canonicalModel ||= "ATT03_TH"
    productName ||= "Tecnodom ATT03_TH Blast Chiller"
    addBrand("Tecnodom S.P.A.")
    addBrand("Tecnodom")
    addModel("ATT03_TH")
    addModel("ATT03-TH")
    addModel("ATT03 TH")
    addModel("ATT03")
    addSearch("Tecnodom ATT03_TH")
    addSearch("Tecnodom ATT03 TH")
    addSearch("Tecnodom ATT03-TH blast chiller")
    addSearch("Tecnodom Attila ATT03-TH cooling cell")
    addSearch("Tecnodom ATT03_TH dimensions")
    addEquipment("blast chiller")
  }

  return {
    canonical_brand: canonicalBrand,
    canonical_model: canonicalModel,
    product_name: productName,
    brand_candidates: unique(brandCandidates),
    model_candidates: unique(modelCandidates),
    search_terms: unique(searchTerms),
    equipment_type_candidates: unique(equipmentCandidates),
  }
}

function looksLikeModel(value: string) {
  const text = value.trim()
  const compactText = compact(text)
  if (compactText.length < 3 || compactText.length > 24) return false
  if (!/[a-z]/i.test(compactText) || !/\d/.test(compactText)) return false
  if (/^(serial|model|type|code|made|input|output|voltage|phase|gross|net)$/i.test(text)) return false
  if (/^(ce|ukca|hz|kg|mm|cm|litres?)$/i.test(text)) return false
  return true
}

function readAfterLabels(text: string, labels: string[], maxLength = 36) {
  const values: string[] = []
  const joinedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const pattern = new RegExp(
    `\\b(?:${joinedLabels})\\b\\s*(?:no\\.?|number|code)?\\s*[:#\\-–—]?\\s*([A-Z0-9][A-Z0-9 ./_\\-]{1,${maxLength}})`,
    "gi"
  )
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    const raw = cleanText(match[1])
      .replace(/\b(?:serial|s\/?n|sn|voltage|power|input|made|ce|ukca|gross|net|weight)\b.*$/i, "")
      .replace(/[|]+/g, " ")
      .trim()
    if (raw) values.push(raw)
  }

  return unique(values)
}

function detectBrandCandidates(text: string, brandHint?: string | null) {
  const candidates = brandHint ? [titleCaseBrand(cleanText(brandHint))] : []
  for (const brand of KNOWN_BRANDS) {
    const pattern = new RegExp(`\\b${brand.replace(/\s+/g, "\\s+")}\\b`, "i")
    if (pattern.test(text)) candidates.push(brand)
  }

  candidates.push(...readAfterLabels(text, ["brand", "make", "manufacturer", "mfr"], 32).map(titleCaseBrand))
  return unique(candidates).slice(0, 6)
}

function detectModelCandidates(text: string, modelHint?: string | null) {
  const candidates = modelHint ? [cleanText(modelHint).toUpperCase()] : []
  const labeled = readAfterLabels(text, ["model", "model no", "model number", "f. mod", "comm. mod", "comm mod", "type", "code", "product code", "item", "sku", "pnc"], 32)
  candidates.push(...labeled.filter(looksLikeModel).map((value) => value.toUpperCase()))

  const tokenPattern = /\b[A-Z]{1,6}[-/]?[A-Z0-9]{0,5}\d{2,5}(?:[A-Z0-9]*|(?:[/\-\s][A-Z0-9]{1,6}){0,4})\b/g
  const matches = text.toUpperCase().match(tokenPattern) || []
  candidates.push(...matches.filter(looksLikeModel))

  const pnc = text.toUpperCase().match(/\b(?:PNC|PROD(?:UCT)?(?:\s+NO)?)[\s:#-]*([A-Z0-9\s]{4,18})\b/i)?.[1]
  if (pnc) candidates.push(pnc.replace(/\s+/g, "").slice(0, 14))

  const cleaned = unique(candidates)
    .map((value) => value.replace(/\s*\/\s*/g, "/").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim())
    .filter((value) => !/^S\/?N$/i.test(value))

  return cleaned.slice(0, 8)
}

function detectSerialCandidates(text: string) {
  return readAfterLabels(text, ["serial", "serial no", "serial number", "s/n", "sn"], 40).slice(0, 5)
}

function detectEquipmentCandidates(text: string) {
  const checks: Array<[RegExp, string]> = [
    [/\b(bulk\s*brew|filter\s*coffee|coffee\s*machine|hot\s*water\s*dispenser|beverage)\b/i, "bulk brew coffee machine and hot water dispenser"],
    [/\b(toast[-\s]?qwik|conveyor\s+toaster|toaster)\b/i, "electric conveyor toaster"],
    [/\bkebab|doner|donner|shawarma|gyro/i, "gas doner kebab machine"],
    [/\bupright\s+fridge|single\s+door\s+fridge|refrigerator|fridge|chiller/i, "upright fridge"],
    [/\bfreezer|blast\s+freezer/i, "freezer"],
    [/\bfryer|chip\s+fryer|deep\s+fryer/i, "fryer"],
    [/\bcombi\s+oven/i, "combi oven"],
    [/\boven|range/i, "oven"],
    [/\bgriddle|plancha/i, "griddle"],
    [/\bdishwasher|glasswasher|warewasher/i, "dishwasher"],
    [/\bmixer|planetary/i, "mixer"],
  ]

  return checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => label)
}

function detectPowerDetails(text: string) {
  const ampMatch = text.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*a(?:mp|mps)?\b/i)
  const ampValue = ampMatch?.[1] ? Number(ampMatch[1].replace(",", ".")) : null
  const safeAmpText = ampMatch?.[0] && ampValue && ampValue <= 125 ? ampMatch[0] : ""

  return unique(
    [
      text.match(/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)(?=\b|\d|n)/i)?.[1],
      text.match(/\b(single\s+phase|three\s+phase|1\s*phase|3\s*phase)\b/i)?.[1],
      safeAmpText,
      text.match(/\b(\d{1,5}(?:[.,]\d+)?)\s*w\b/i)?.[0],
      text.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*kw\b/i)?.[0],
      text.match(/\b(50(?:\/60)?\s*hz|60\s*hz)\b/i)?.[1],
      text.match(/\b(natural gas|lpg|propane)\b/i)?.[1],
    ]
      .filter(Boolean)
      .map((value) => cleanText(value))
  )
}

function detectFrequency(text: string) {
  return cleanText(text.match(/\b(50(?:\/60)?\s*hz|60\s*hz)\b/i)?.[1] || "")
}

function detectGasType(text: string) {
  return cleanText(
    text.match(/\b(natural\s+gas|mains\s+gas|G20|LPG|propane|butane|G30|G31)\b/i)?.[1] || ""
  )
}

function detectGasConnection(text: string) {
  return cleanText(
    text.match(/\b(\d\/\d["']?\s*BSP|\d+(?:\.\d+)?\s*mm\s*(?:gas\s*)?(?:connection|inlet))\b/i)?.[1] || ""
  )
}

function detectHeatInputKw(text: string) {
  const match =
    text.match(/\b(?:heat\s*input|total\s*gas\s*rate|gas\s*rate)[^0-9]{0,24}(\d{1,3}(?:[,.]\d+)?)\s*kW\b/i) ||
    text.match(/\b(\d{1,3}(?:[,.]\d+)?)\s*kW\b/i)
  if (!match?.[1]) return null
  const value = Number(match[1].replace(",", "."))
  return Number.isFinite(value) && value > 0 ? value : null
}

function detectRefrigerantDetails(text: string) {
  return unique(
    [
      text.match(/\b(R\s?290|R\s?600a|R\s?134a|R\s?404a|R\s?452a|CO2)\b/i)?.[1],
      text.match(/\brefrigerant[^0-9a-z]{0,16}([A-Z0-9 ]{2,12})/i)?.[1],
      text.match(/\b(\d{1,4}\s?g)\b/i)?.[1],
    ]
      .filter(Boolean)
      .map((value) => cleanText(value).toUpperCase().replace(/\s+/g, ""))
  )
}

export function extractSpecPlateDetails({
  rawText,
  brandHint,
  modelHint,
}: {
  rawText?: string | null
  brandHint?: string | null
  modelHint?: string | null
}): CaterBotSpecExtraction {
  const text = cleanText(rawText || "")
  const normalised = normaliseCaterBotModel(text, [brandHint, modelHint].filter(Boolean).join(" "))
  const brandCandidates = unique([
    ...normalised.brand_candidates,
    ...detectBrandCandidates(text, normalised.canonical_brand || brandHint),
  ])
  const modelCandidates = unique([
    ...normalised.model_candidates,
    ...detectModelCandidates(text, normalised.canonical_model || modelHint),
  ])
  const serialCandidates = detectSerialCandidates(text)
  const equipmentCandidates = unique([...normalised.equipment_type_candidates, ...detectEquipmentCandidates(text)])
  const powerDetails = detectPowerDetails(text)
  const refrigerantDetails = detectRefrigerantDetails(text)
  const brand = normalised.canonical_brand || brandCandidates[0] || ""
  const model = normalised.canonical_model || modelCandidates[0] || ""
  const serial = serialCandidates[0] || ""
  const equipmentType = equipmentCandidates[0] || ""
  const gasType = detectGasType(text)
  const gasConnection = detectGasConnection(text)
  const heatInputKw = detectHeatInputKw(text)
  const confidence =
    (brand ? 0.34 : 0) +
    (model ? 0.42 : 0) +
    (serial ? 0.08 : 0) +
    (equipmentType ? 0.08 : 0) +
    (powerDetails.length || refrigerantDetails.length ? 0.08 : 0)

  return {
    raw_text: text,
    brand_candidates: brandCandidates,
    model_candidates: modelCandidates,
    serial_candidates: serialCandidates,
    equipment_type_candidates: equipmentCandidates,
    power_details: powerDetails,
    refrigerant_details: refrigerantDetails,
    brand,
    model,
    product_name: normalised.product_name || [brand, model, equipmentType].filter(Boolean).join(" "),
    serial,
    equipment_type: equipmentType,
    power: powerDetails.join(", "),
    gas_type: gasType,
    gas_connection: gasConnection,
    heat_input_kw: heatInputKw,
    refrigerant: refrigerantDetails.join(", "),
    frequency: detectFrequency(text),
    confidence: Math.min(1, Number(confidence.toFixed(2))),
  }
}

export function buildSpecLookupQueries({
  brand,
  model,
  equipmentType,
  productTitle,
  rawText,
}: {
  brand: string
  model: string
  equipmentType?: string | null
  productTitle?: string | null
  rawText?: string | null
}) {
  const modelSignals = normaliseCaterBotModel([brand, model, equipmentType, productTitle, rawText].filter(Boolean).join(" "))
  const brandText = cleanText(modelSignals.canonical_brand || brand)
  const modelText = cleanText(model)
  if (!modelText) return []

  const variants = unique([
    ...buildModelSearchVariants(modelSignals.canonical_model || modelText, [equipmentType, productTitle].filter(Boolean).join(" ")),
    ...modelSignals.model_candidates,
    ...modelSignals.search_terms.filter((term) => /[a-z]/i.test(term) && /\d/.test(term)),
  ]).slice(0, 12)
  const manufacturerDomain = manufacturerDomainForBrand(brandText)
  const equipment = cleanText(modelSignals.equipment_type_candidates[0] || equipmentType)
  const queries: string[] = []
  const add = (query: string) => {
    const cleaned = cleanText(query)
    if (cleaned && !queries.some((item) => item.toLowerCase() === cleaned.toLowerCase())) queries.push(cleaned)
  }

  const identity = [brandText, modelSignals.canonical_model || modelText].filter(Boolean).join(" ")
  add(`"${identity}" dimensions weight`)
  add(`"${identity}" manual`)
  add(`"${identity}" instruction manual pdf`)
  add(`"${identity}" specification`)
  add(`"${identity}" gross weight net weight`)
  add(`"${identity}" width depth height`)
  add(`"${identity}" product data sheet`)

  modelSignals.search_terms.forEach((term) => add(`"${term}"`))

  variants.slice(0, 6).forEach((variant) => {
    const variantText = cleanText(variant)
    const variantAlreadyHasBrand =
      brandText && variantText.toLowerCase().includes(brandText.split(/\s+/)[0].toLowerCase())
    const variantIdentity = variantAlreadyHasBrand ? variantText : [brandText, variantText].filter(Boolean).join(" ")
    add(`"${variantIdentity}" manual`)
    add(`"${variantIdentity}" dimensions weight`)
    add(`"${variantIdentity}" specification`)
  })

  if (equipment) add(`"${identity}" "${equipment}"`)

  add(`site:manualslib.com "${identity}"`)
  add(`site:catering-appliance.com "${identity}"`)
  if (manufacturerDomain) add(`site:${manufacturerDomain} "${modelSignals.canonical_model || modelText}"`)
  add(`site:nisbets.co.uk "${identity}"`)
  add(`site:caterkwik.co.uk "${identity}"`)
  add(`site:cs-catering-equipment.co.uk "${identity}"`)
  add(`site:allianceonline.co.uk "${identity}"`)
  add(`site:caterfair.co.uk "${identity}"`)
  add(`site:angliacateringequipment.com "${identity}"`)

  buildCaterBotSourceQueries({
    brand: brandText,
    model: modelSignals.canonical_model || modelText,
    equipmentType: equipment,
    productTitle: [modelSignals.product_name, brandText, modelText, equipment, productTitle].filter(Boolean).join(" "),
  })
    .slice(0, 24)
    .forEach(add)

  return queries.slice(0, 56)
}

function numberFromText(value: string | null | undefined) {
  const match = String(value || "").match(/\d+(?:[,.]\d+)?/)
  if (!match) return null
  const parsed = Number(match[0].replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function kgFromText(value: string | null | undefined) {
  const text = String(value || "")
  const unitMatch = text.match(/(\d{1,6}(?:[,.]\d+)?)\s*(kg|kgs|kilograms?|g|grams?|lb|lbs|pounds?)\b/i)
  const number = unitMatch?.[1] ? Number(unitMatch[1].replace(",", ".")) : numberFromText(text)
  if (!number) return null
  const unit = unitMatch?.[2]?.toLowerCase() || ""
  if (/^(g|gram|grams)$/.test(unit)) return Number((number / 1000).toFixed(2))
  if (/^lb|lbs|pound/.test(unit)) return Number((number * 0.453592).toFixed(1))
  return number
}

function labelledKgFromText(value: string | null | undefined, labels: string[]) {
  const text = cleanText(value || "")
  if (!text) return null
  const joinedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const match = text.match(new RegExp(`\\b(?:${joinedLabels})\\b[^0-9]{0,24}(\\d{1,6}(?:[,.]\\d+)?)\\s*(kg|kgs|kilograms?|g|grams?|lb|lbs|pounds?)\\b`, "i"))
  if (match?.[1]) return kgFromText(`${match[1]} ${match[2] || "kg"}`)
  // Fallback: "(kg)" is inside the label itself, bare number follows — e.g. "Weight (kg): 73"
  const bareMatch = text.match(new RegExp(`\\b(?:${joinedLabels})\\s*\\(?\\s*kg\\s*\\)?[^0-9]{0,20}(\\d{1,6}(?:[,.]\\d+)?)`, "i"))
  return bareMatch?.[1] ? Number(Number(bareMatch[1].replace(",", ".")).toFixed(2)) || null : null
}

function safeAmpsFromText(value: string | null | undefined) {
  const text = cleanSpecValue(value)
  if (!text) return null
  const match = text.match(/\b(\d{1,3}(?:[,.]\d+)?)\s*(?:a|amp|amps|ampere|amperes)\b/i)
  const parsed = match?.[1] ? Number(match[1].replace(",", ".")) : null
  return parsed && Number.isFinite(parsed) && parsed > 0 && parsed <= 125 ? parsed : null
}

function litresFromText(value: string | null | undefined) {
  const multiplied = String(value || "").match(/\b(\d{1,2})\s*x\s*(\d{1,3}(?:[,.]\d+)?)\s*(?:litres?|ltr|l)\b/i)
  if (multiplied?.[1] && multiplied?.[2]) {
    const count = Number(multiplied[1])
    const size = Number(multiplied[2].replace(",", "."))
    const total = count * size
    if (Number.isFinite(total) && total > 0) return Number(total.toFixed(1))
  }

  const match = String(value || "").match(/\b(\d{2,4}(?:[,.]\d+)?)\s*(?:litres?|ltr|l)\b/i)
  if (!match?.[1]) return null
  const parsed = Number(match[1].replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function dimensionValueToCm(value: number, context: string) {
  const hasCm = /\bcm\b|centimet/i.test(context)
  const hasMm = /\bmm\b|millimet/i.test(context)
  const unitLooksMm = value > 300 || (hasMm && !hasCm)
  const unitLooksM = value < 10 && !hasCm && !hasMm
  const converted = unitLooksMm ? value / 10 : unitLooksM ? value * 100 : value
  return Number(converted.toFixed(1))
}

function parseDimensionNumber(value: string, context: string) {
  const parsed = Number(value.replace(",", "."))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return dimensionValueToCm(parsed, context)
}

function dimensionTripletFromMatch(
  match: RegExpMatchArray | null,
  order: Array<"width_cm" | "depth_cm" | "height_cm">,
  context: string
) {
  if (!match?.[1] || !match?.[2] || !match?.[3]) return null
  const values = [match[1], match[2], match[3]].map((item) => parseDimensionNumber(item, context))
  if (values.some((item) => !item)) return null
  return order.reduce(
    (acc, key, index) => ({ ...acc, [key]: values[index] || null }),
    { height_cm: null as number | null, width_cm: null as number | null, depth_cm: null as number | null }
  )
}

export function dimensionsFromText(value: string | null | undefined) {
  const text = cleanText(value || "")
  if (!text) return { height_cm: null, width_cm: null, depth_cm: null }

  const headerHeightWidthDepth = dimensionTripletFromMatch(
    text.match(/\bheight\s+width\s+depth\b[^0-9]{0,40}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["height_cm", "width_cm", "depth_cm"],
    text
  )
  if (headerHeightWidthDepth?.height_cm && headerHeightWidthDepth.width_cm && headerHeightWidthDepth.depth_cm) {
    return headerHeightWidthDepth
  }

  const headerWidthDepthHeight = dimensionTripletFromMatch(
    text.match(/\b(?:width|w)\s+(?:depth|d|length|l)\s+(?:height|h)\b[^0-9]{0,40}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s+(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"],
    text
  )
  if (headerWidthDepthHeight?.height_cm && headerWidthDepthHeight.width_cm && headerWidthDepthHeight.depth_cm) {
    return headerWidthDepthHeight
  }

  const labeled = {
    width_cm:
      parseDimensionNumber(
        text.match(/\b(?:width|w)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "",
        text
      ) ||
      parseDimensionNumber(
        text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*w\s*\)|\bwide\b)/i)?.[1] || "",
        text
      ),
    depth_cm:
      parseDimensionNumber(
        text.match(/\b(?:depth|length|d|l)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "",
        text
      ) ||
      parseDimensionNumber(
        text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*d\s*\)|\bdeep\b)/i)?.[1] || "",
        text
      ),
    height_cm:
      parseDimensionNumber(
        text.match(/\b(?:height|h)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\b/i)?.[1] || "",
        text
      ) ||
      parseDimensionNumber(
        text.match(/\b(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:\(\s*h\s*\)|\bhigh\b)/i)?.[1] || "",
        text
      ),
  }
  if (labeled.height_cm && labeled.width_cm && labeled.depth_cm) return labeled

  const ldh = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)[^\d]{0,80}(?:l\s*x\s*d\s*x\s*h|lxdxh|lxpxh|l\s*x\s*p\s*x\s*h)[^\d]{0,20}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"],
    text
  )
  if (ldh?.height_cm && ldh.width_cm && ldh.depth_cm) return ldh

  const wdh = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)?[^\d]{0,40}(?:w\s*x\s*d\s*x\s*h|wxdxh|w\s*x\s*l\s*x\s*h)[^\d]{0,20}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["width_cm", "depth_cm", "height_cm"],
    text
  )
  if (wdh?.height_cm && wdh.width_cm && wdh.depth_cm) return wdh

  const hwd = dimensionTripletFromMatch(
    text.match(/\b(?:dimensions?|size)?[^\d]{0,40}(?:h\s*x\s*w\s*x\s*d|hxwxd|h\s*x\s*w\s*x\s*l)[^\d]{0,30}(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i),
    ["height_cm", "width_cm", "depth_cm"],
    text
  )
  if (hwd?.height_cm && hwd.width_cm && hwd.depth_cm) return hwd

  // Bare triplet with a required trailing unit: "25.2 x 50 x 50.2 cm" or "252 x 500 x 502 mm".
  // The trailing unit (not per-number) is the norm for extracted spec strings like those produced
  // by dimensionsFromLabeledFields in sourceValidation — the catch-all below would reject these
  // because only the last number has an attached unit.
  const trailingUnit = dimensionTripletFromMatch(
    text.match(/\b(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)\b/i),
    ["width_cm", "depth_cm", "height_cm"],
    text
  )
  if (trailingUnit?.height_cm && trailingUnit.width_cm && trailingUnit.depth_cm) return trailingUnit

  // Catch-all: only accept numbers that carry their OWN attached unit (mm/cm) OR
  // their OWN axis label (W/D/H). Bare numbers from model/serial strings
  // (e.g. XV893 → 89.3) are rejected even when real "mm" values exist elsewhere
  // in the same text — a wrong auto-fill is worse than a blank.
  const axisMatches = Array.from(
    text.matchAll(/(\d+(?:[,.]\d+)?)\s*(mm|cm)?\s*(?:\(\s*([HWD])\s*\))?/gi)
  )
  const useful = axisMatches
    .map((match) => ({
      value: Number(match[1].replace(",", ".")),
      hasUnit: Boolean(match[2]),
      axis: (match[3] || "").toUpperCase(),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0 && (item.hasUnit || item.axis))
    .slice(0, 3)

  if (useful.length < 3) return { height_cm: null, width_cm: null, depth_cm: null }

  // Require at least one axis label OR at least one number with an attached unit
  const hasAnyLabel = useful.some((item) => item.axis)
  const hasAnyUnit = useful.some((item) => item.hasUnit)
  if (!hasAnyLabel && !hasAnyUnit) return { height_cm: null, width_cm: null, depth_cm: null }

  const converted = useful.map((item) => ({
    ...item,
    value: dimensionValueToCm(item.value, text),
  }))
  const byAxis = Object.fromEntries(converted.filter((item) => item.axis).map((item) => [item.axis, item.value]))

  if (byAxis.H && byAxis.W && byAxis.D) {
    return { height_cm: byAxis.H, width_cm: byAxis.W, depth_cm: byAxis.D }
  }

  const [width, depth, height] = converted.map((item) => item.value)
  return { height_cm: height, width_cm: width, depth_cm: depth }
}

function plausibleDimensions(
  dims: ReturnType<typeof dimensionsFromText>
): ReturnType<typeof dimensionsFromText> | null {
  const { height_cm, width_cm, depth_cm } = dims
  if (!height_cm || !width_cm || !depth_cm) return null
  if (height_cm < 10 || width_cm < 10 || depth_cm < 10) return null
  return dims
}

function sourceSpecsText(source: CaterBotSourceValidationResult | null, rawText: string) {
  const extracted = source?.extractedSpecs
  return [
    extracted?.dimensions,
    extracted?.packedDimensions,
    extracted?.weight,
    extracted?.grossWeight,
    extracted?.capacity,
    extracted?.voltage,
    extracted?.phase,
    extracted?.amps,
    extracted?.kwRating,
    extracted?.gasType,
    source?.sourceTitle,
    source?.sourceName,
    source?.url,
    source?.matchNotes,
    ...(source?.usefulDetails || []),
    rawText,
  ]
    .map(cleanSpecValue)
    .filter(Boolean)
    .join(" ")
}

function palletSize(
  weight: number | null,
  dimensions: { height_cm: number | null; width_cm: number | null; depth_cm: number | null }
) {
  const maxDimension = Math.max(dimensions.height_cm || 0, dimensions.width_cm || 0, dimensions.depth_cm || 0)
  if (!weight && !maxDimension) return "Needs seller check"
  if ((weight || 0) > 1000 || maxDimension > 220) return "Needs seller check"
  if ((weight || 0) <= 30 && maxDimension <= 120) return "Mini Quarter Pallet"
  if ((weight || 0) <= 150) return "Mini Quarter Pallet"
  if ((weight || 0) <= 300) return "Quarter Pallet"
  if ((weight || 0) <= 500) return "Half Pallet"
  if ((weight || 0) <= 750) return "Light Pallet"
  return "Full Pallet"
}

function categoryForEquipmentType(value: string) {
  const text = value.toLowerCase()
  if (/\bvan|trailer|mobile\b/.test(text)) return { category: "Catering Vans & Trailers", type: "Mobile Catering Units" }
  if (/\bbusiness|cafe|takeaway|restaurant\b/.test(text)) return { category: "Catering Businesses", type: "Hospitality Business" }
  if (/\bfridge|refriger|freezer|chiller\b/.test(text)) return { category: "Catering Equipment", type: "Refrigeration" }
  if (/\bdishwasher|glasswasher|warewasher|pass\s*through|passthrough|hood\s*type\b/.test(text)) {
    return { category: "Catering Equipment", type: "Warewashing & Sinks" }
  }
  if (/\btoast|toaster|conveyor\s+toaster\b/.test(text)) {
    return { category: "Catering Equipment", type: "Cooking Equipment" }
  }
  if (/\bcoffee|bulk brew|beverage|hot water|boiler|dispenser\b/.test(text)) {
    return { category: "Catering Equipment", type: "Coffee & Bar Equipment" }
  }
  return { category: "Catering Equipment", type: "Cooking Equipment" }
}

function titleCaseWords(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function buildSpecTitle(extraction: CaterBotSpecExtraction, condition = "Used") {
  if (/\bbravilor|bonamat/i.test(extraction.brand) && /\bb10\s*hw|b10hw/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return `Bravilor Bonamat B10 HW 2 x 10L Bulk Brew Coffee Machine & Hot Water Dispenser${condition ? ` - ${condition}` : ""}`
  }
  if (/\barchway/i.test(extraction.brand) && /\b4B\s*STD/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    const fuel = /lpg|propane|g30|g31/i.test(`${extraction.gas_type} ${extraction.raw_text}`) ? "LPG" : "Natural Gas"
    return `Archway 4B STD / NG ${fuel} 4 Burner Doner Kebab Grill${condition ? ` - ${condition}` : ""}`
  }
  if (/\bpolar/i.test(extraction.brand) && /\bU\s*632\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return `Polar U632 U-Series Single Door Upright Fridge 650L${condition ? ` - ${condition}` : ""}`
  }
  if (/\bswan/i.test(extraction.brand) && /\bSWU\s*20\s*L\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return `Swan SWU20L Bulk Brew Coffee Machine and Hot Water Dispenser${condition ? ` - ${condition}` : ""}`
  }
  if (/\belectrolux/i.test(extraction.brand) && /\bEHT8\s*G\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return `Electrolux Professional green&clean EHT8G Hood Type Passthrough Dishwasher${condition ? ` - ${condition}` : ""}`
  }
  if (/\bhatco/i.test(extraction.brand) && /\bTQ[-\s]?805\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return `Hatco Toast-Qwik TQ-805 Electric Conveyor Toaster${condition ? ` - ${condition}` : ""}`
  }
  const brand = titleCaseBrand(extraction.brand)
  const model = cleanText(extraction.model).toUpperCase()
  const equipment = titleCaseWords(extraction.equipment_type || "Commercial Catering Equipment")
  const fuel = /g20|natural/i.test(extraction.gas_type) ? "Natural Gas" : /lpg|propane|g30|g31/i.test(extraction.gas_type) ? "LPG" : ""
  const parts = [brand, model, fuel, equipment]
    .filter(Boolean)
    .filter((part, index, all) => {
      const lower = part.toLowerCase()
      if (lower === "natural gas" && all.some((candidate) => /natural gas|gas/i.test(candidate) && candidate !== part)) return false
      return all.findIndex((candidate) => candidate.toLowerCase() === lower) === index
    })
  return `${parts.join(" ")}${condition ? ` - ${condition}` : ""}`.trim()
}

function powerDetailsForSpecs({
  powerType,
  voltage,
  phase,
  frequency,
  watts,
  kw,
  gasType,
  gasConnection,
  heatInputKw,
}: {
  powerType: string
  voltage: string
  phase: string
  frequency: string
  watts: number | null
  kw: number | null
  gasType: string
  gasConnection: string
  heatInputKw: number | null
}) {
  const parts = [
    voltage,
    phase,
    frequency,
    watts && watts >= 1000 ? `${Number((watts / 1000).toFixed(2))}kW` : watts ? `${watts}W` : "",
    kw && !watts && !(heatInputKw && Math.abs(kw - heatInputKw) < 0.05) ? `${kw}kW` : "",
    gasType,
    gasConnection ? `${gasConnection} gas connection` : "",
    heatInputKw && /gas/i.test(powerType) ? `${heatInputKw}kW heat input` : "",
  ].filter(Boolean)
  if (!parts.length) return powerType || ""
  return parts.join(", ").replace(/\s+/g, " ").trim()
}

function safetyNoteForSpecs(specs: {
  powerType: string
  voltage: string
  phase: string
  watts: number | null
  gasType: string
  heatInputKw: number | null
  equipmentType: string
}) {
  if (/\b400|415/.test(specs.voltage) || /3|three/i.test(specs.phase) || (specs.watts || 0) >= 7000) {
    return "High-power 400V 3-phase appliance. Installation and electrical checks should be completed by a qualified person."
  }
  if (/gas|natural|lpg|propane/i.test(`${specs.powerType} ${specs.gasType}`) || specs.heatInputKw) {
    return "Gas catering appliance. Buyer should confirm gas connection, safe disconnection and installation requirements."
  }
  if (/fridge|freezer|refriger/i.test(specs.equipmentType)) {
    return "Refrigeration equipment should be transported upright where possible and allowed to settle before use."
  }
  return ""
}

function shortDescriptionForSpecs(extraction: CaterBotSpecExtraction, title: string, source: CaterBotSourceValidationResult | null) {
  if (/\bswan/i.test(extraction.brand) && /\bSWU\s*20\s*L\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return "Commercial bulk brew coffee machine and hot water dispenser. CaterBot identified this as a Swan SWU20L series unit from the rating plate and source matches. Seller should confirm exact setup, dimensions and condition."
  }
  if (/\bbravilor|bonamat/i.test(extraction.brand) && /\bb10\s*hw|b10hw/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return "Commercial bulk brew coffee machine and hot water dispenser. CaterBot identified this as a Bravilor Bonamat B10 HW series unit from the rating plate and source matches. Seller should confirm exact setup, dimensions and condition."
  }
  if (/\bhatco/i.test(extraction.brand) && /\bTQ[-\s]?805\b/i.test(`${extraction.model} ${extraction.raw_text}`)) {
    return "Hatco Toast-Qwik TQ-805 electric conveyor toaster for commercial catering use. Seller should confirm condition, electrical connection and collection requirements before purchase."
  }
  if (/fridge|freezer|refriger/i.test(extraction.equipment_type)) {
    return `${title.replace(/\s+-\s+Used$/i, "")} suitable for catering, cafe or takeaway use. Buyer should confirm dimensions, power requirements and collection access before purchase.`
  }
  if (/gas|natural|lpg|propane/i.test(`${extraction.gas_type} ${extraction.equipment_type}`)) {
    return `${title.replace(/\s+-\s+Used$/i, "")} for commercial catering use. Please confirm gas type, condition and collection requirements before purchase.`
  }
  return `${title.replace(/\s+-\s+Used$/i, "")} for commercial catering use. Please review photos and confirm condition, dimensions and collection requirements before purchase.`
}

function deliveryNotesForSpecs({
  extraction,
  suggestedPalletSize,
  hasDimensions,
  hasWeight,
}: {
  extraction: CaterBotSpecExtraction
  suggestedPalletSize: string
  hasDimensions: boolean
  hasWeight: boolean
}) {
  const notes: string[] = []
  if (!hasWeight) notes.push("Weight not confirmed. Seller must check before booking delivery.")
  if (!hasDimensions) notes.push("Dimensions not confirmed. Seller must check before booking delivery.")
  if (/gas|g20|lpg|propane/i.test(`${extraction.power} ${extraction.gas_type}`)) {
    notes.push("Gas catering appliance. Buyer should confirm gas connection, collection access and safe transport before purchase.")
  }
  if (/fridge|freezer|refriger|chiller/i.test(extraction.equipment_type)) {
    notes.push("Refrigeration equipment may need upright transport and specialist handling.")
  }
  if (suggestedPalletSize && suggestedPalletSize !== "Needs seller check") {
    notes.push(`CaterBot pallet suggestion: ${suggestedPalletSize}.`)
  }
  return notes.join(" ")
}

function knownModelSpecs(extraction: CaterBotSpecExtraction) {
  const context = `${extraction.brand} ${extraction.model} ${extraction.product_name} ${extraction.raw_text}`
  if (/\bswan\b/i.test(context) && /\bSWU\s*20\s*L\b/i.test(context)) {
    return {
      height_cm: 29.3,
      width_cm: 54.9,
      depth_cm: 37.8,
      net_weight_kg: 3.86,
      gross_weight_kg: null,
      capacity_litres: 20,
      voltage: "230-240 V",
      phase: "1 phase",
      watts: 2200,
      amps: 13,
      power_details: "230-240V, 50Hz, 13A, 2200W",
      delivery_notes:
        "Small countertop coffee and hot water appliance. For launch, use collection only or prepare it securely on a Mini Quarter Pallet for CaterBids pallet delivery.",
    }
  }

  if (/\bhatco\b/i.test(context) && /\bTQ[-\s]?805\b/i.test(context)) {
    return {
      height_cm: 42.2,
      width_cm: 36.8,
      depth_cm: 57.8,
      net_weight_kg: 28,
      gross_weight_kg: null,
      capacity_litres: null,
      voltage: /240\s?V/i.test(context) ? "230/240 V" : "230 V",
      phase: "",
      watts: /3625\s?W/i.test(context) ? 3625 : 3330,
      amps: /15\.?1\s?A/i.test(context) ? 15.1 : 14.5,
      power_details: "3330W @ 230V (14.5A), up to 3625W @ 240V (15.1A)",
      delivery_notes:
        "Conveyor toaster. Confirm rear toast tray clearance, collection access and electrical requirements before courier booking.",
    }
  }

  return null
}

export function specsFromValidatedSource(
  source: CaterBotSourceValidationResult | null,
  extraction: CaterBotSpecExtraction,
  dimensionHint?: string | null,
  weightHint?: string | null
): CaterBotStructuredSpecs {
  const rawText = extraction.raw_text || ""
  const sourceContext = `${source?.sourceTitle || ""} ${source?.sourceName || ""} ${source?.url || ""} ${rawText}`
  const corrected = normaliseCaterBotModel(sourceContext, extraction.equipment_type)
  const correctedExtraction: CaterBotSpecExtraction = {
    ...extraction,
    brand: corrected.canonical_brand || extraction.brand,
    model: corrected.canonical_model || extraction.model,
    product_name: corrected.product_name || extraction.product_name,
    equipment_type: corrected.equipment_type_candidates[0] || extraction.equipment_type,
  }
  const knownSpecs = knownModelSpecs(correctedExtraction)
  const sourceText = sourceSpecsText(source, rawText)
  // Priority for dimensions (each tried in isolation to prevent AI OCR
  // hallucinations from contaminating validated values):
  // 1. source.extractedSpecs.dimensions — from a page-fetched, brand-verified source
  // 2. dimensionHint — the main scan's already-merged dimension string (passed from page)
  // 3. full sourceText blob — last resort, may include model-number-derived noise
  const sourceDimsOnly = source?.extractedSpecs?.dimensions
    ? plausibleDimensions(dimensionsFromText(source.extractedSpecs.dimensions))
    : null
  const hintDims = dimensionHint ? plausibleDimensions(dimensionsFromText(dimensionHint)) : null
  const rawTextFallback = plausibleDimensions(dimensionsFromText(sourceText))
  const externalDimensions =
    hintDims ??
    sourceDimsOnly ??
    rawTextFallback ??
    { height_cm: null, width_cm: null, depth_cm: null }
  const parsedNetWeight =
    labelledKgFromText(weightHint, ["net weight", "net wt", "product weight", "empty weight", "weight"]) ||
    kgFromText(source?.extractedSpecs.weight) ||
    labelledKgFromText(sourceText, ["net weight", "net wt", "product weight", "empty weight", "weight"]) ||
    null
  const parsedGrossWeight =
    labelledKgFromText(weightHint, ["gross weight", "gross wt", "shipping weight", "ship weight", "packed weight"]) ||
    kgFromText(source?.extractedSpecs.grossWeight) ||
    labelledKgFromText(sourceText, ["gross weight", "gross wt", "shipping weight", "ship weight", "packed weight"]) ||
    null
  const capacity =
    litresFromText(sourceText) ||
    litresFromText(source?.extractedSpecs.capacity) ||
    litresFromText(rawText)
  const voltage =
    cleanSpecValue(source?.extractedSpecs.voltage) ||
    cleanSpecValue(extraction.power.match(/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)(?=\b|\d|n)/i)?.[1]) ||
    cleanSpecValue(rawText.match(/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)(?=\b|\d|n)/i)?.[1]) ||
    cleanSpecValue(knownSpecs?.voltage)
  const phase =
    cleanSpecValue(source?.extractedSpecs.phase) ||
    cleanSpecValue(extraction.power.match(/\b(single\s+phase|three\s+phase|1\s*phase|3\s*phase)\b/i)?.[1]) ||
    cleanSpecValue(rawText.match(/\b(3\s*N|3N|three\s+phase|3\s*phase)\b/i)?.[1]?.replace(/^3N$/i, "3 phase"))
  const amps = safeAmpsFromText(source?.extractedSpecs.amps) || safeAmpsFromText(rawText)
  const rawWatts = numberFromText(rawText.match(/\b(\d{4,5}(?:[,.]\d+)?)\s*W\b/i)?.[0]) || knownSpecs?.watts || null
  const gasType = cleanSpecValue(source?.extractedSpecs.gasType) || cleanSpecValue(correctedExtraction.gas_type)
  const isGas = /gas|lpg|propane|g20|g30|g31/i.test(`${source?.extractedSpecs.gasType || ""} ${correctedExtraction.gas_type} ${correctedExtraction.power}`)
  const sourceKwText = cleanSpecValue(source?.extractedSpecs.kwRating)
  const sourceKw = numberFromText(sourceKwText)
  const plateKw = correctedExtraction.heat_input_kw
  const rawKw = rawWatts ? Number((rawWatts / 1000).toFixed(2)) : null
  const kw = isGas
    ? plateKw || sourceKw
    : Math.max(sourceKw || 0, rawKw || 0, plateKw || 0) || null
  const watts =
    rawWatts ||
    (!isGas && kw
      ? Number((kw * 1000).toFixed(0))
      : null)
  const refrigerant = correctedExtraction.refrigerant_details.find((item) => /^R|CO2/i.test(item)) || ""
  const refrigerantMass = correctedExtraction.refrigerant_details.find((item) => /\d+G$/i.test(item)) || ""
  const rawWeightForPallet = parsedGrossWeight || parsedNetWeight || knownSpecs?.net_weight_kg || null
  const sourceLooksCountertop = /\b(coffee|hot\s*water|bulk\s*brew|toaster|countertop|counter\s*top|tabletop|kettle|boiler|dispenser)\b/i.test(
    `${correctedExtraction.equipment_type} ${correctedExtraction.product_name} ${titleCaseWords(correctedExtraction.equipment_type)} ${sourceContext}`
  )
  const weightLooksWrong = Boolean(rawWeightForPallet && rawWeightForPallet > 1000 && sourceLooksCountertop)
  const correctedKnownWeight = weightLooksWrong ? knownSpecs?.net_weight_kg || null : null
  const weightForPallet = correctedKnownWeight || (weightLooksWrong ? null : rawWeightForPallet)
  const dimensionsForPallet = {
    height_cm: externalDimensions.height_cm || knownSpecs?.height_cm || null,
    width_cm: externalDimensions.width_cm || knownSpecs?.width_cm || null,
    depth_cm: externalDimensions.depth_cm || knownSpecs?.depth_cm || null,
  }
  const suggestedPalletSize = palletSize(weightForPallet, dimensionsForPallet)
  const category = categoryForEquipmentType(correctedExtraction.equipment_type)
  const hasDimensions = Boolean(externalDimensions.height_cm && externalDimensions.width_cm && externalDimensions.depth_cm)
  const hasWeight = Boolean(weightForPallet)
  const powerType = isGas
    ? "Gas"
    : voltage || phase || amps || watts
      ? "Electric"
      : ""
  const frequency = correctedExtraction.frequency || rawText.match(/\b(50(?:\/60)?\s*Hz|60\s*Hz)\b/i)?.[1] || ""
  const title = buildSpecTitle(correctedExtraction)
  const powerDetails = powerDetailsForSpecs({
    powerType,
    voltage,
    phase,
    frequency,
    watts,
    kw,
    gasType,
    gasConnection: correctedExtraction.gas_connection,
    heatInputKw: correctedExtraction.heat_input_kw,
  })
  const safetyNote = safetyNoteForSpecs({
    powerType,
    voltage,
    phase,
    watts,
    gasType,
    heatInputKw: correctedExtraction.heat_input_kw,
    equipmentType: correctedExtraction.equipment_type,
  })

  return {
    title,
    category: category.category,
    type: category.type,
    condition: "Used",
    brand: correctedExtraction.brand,
    model: correctedExtraction.model,
    weight_kg: weightForPallet,
    height_cm: dimensionsForPallet.height_cm,
    width_cm: dimensionsForPallet.width_cm,
    depth_cm: dimensionsForPallet.depth_cm,
    net_weight_kg: correctedKnownWeight || (weightLooksWrong ? null : parsedNetWeight || knownSpecs?.net_weight_kg || null),
    gross_weight_kg: weightLooksWrong ? null : parsedGrossWeight,
    capacity_litres: capacity,
    power_type: powerType,
    voltage,
    phase,
    watts,
    amps: amps || knownSpecs?.amps || null,
    gas_type: gasType,
    gas_connection: correctedExtraction.gas_connection,
    heat_input_kw: correctedExtraction.heat_input_kw,
    refrigerant,
    refrigerant_mass: refrigerantMass,
    frequency,
    power_details: knownSpecs?.power_details || powerDetails,
    short_description: shortDescriptionForSpecs(correctedExtraction, title, source),
    safety_note: safetyNote,
    pallet_required:
      suggestedPalletSize !== "Needs seller check" &&
      suggestedPalletSize !== "Mini Quarter Pallet",
    suggested_pallet_size: suggestedPalletSize,
    delivery_notes:
      knownSpecs?.delivery_notes ||
      [
        weightLooksWrong ? "Weight looks incorrect. Seller must confirm before booking delivery." : "",
        deliveryNotesForSpecs({
          extraction: correctedExtraction,
          suggestedPalletSize,
          hasDimensions: hasDimensions || Boolean(knownSpecs?.height_cm && knownSpecs.width_cm && knownSpecs.depth_cm),
          hasWeight,
        }),
      ].filter(Boolean).join(" "),
  }
}

export async function findBestSpecSource({
  brand,
  model,
  equipmentType,
  fuelType,
  productTitle,
  rawText,
}: {
  brand: string
  model: string
  equipmentType?: string | null
  fuelType?: string | null
  productTitle?: string | null
  rawText?: string | null
}) {
  const searchQueries = buildSpecLookupQueries({ brand, model, equipmentType, productTitle, rawText })
  const knownContext = `${brand} ${model} ${equipmentType || ""} ${productTitle || ""} ${rawText || ""}`
  const knownUrls = unique([
    /\bhatco\b/i.test(knownContext) && /\bTQ[-\s]?805\b/i.test(knownContext)
      ? "https://www.catering-appliance.com/hatco-tq-805-toast-qwik-conveyor-toaster"
      : "",
  ].filter(Boolean))

  async function runSearch() {
    for (const url of knownUrls) {
      const validation = await validateCaterBotProductSource({
        url,
        brand,
        model,
        equipmentType,
        fuelType,
        candidateTitle: productTitle,
        candidateSnippet: rawText,
      })

      if (validation.valid) {
        return {
          searchQueries,
          candidateUrls: knownUrls,
          selected: validation,
          snippetDimensions: null as string | null,
          snippetWeightText: null as string | null,
          searchErrors: [] as string[],
          provider: "Trusted exact-model source" as string | null,
        }
      }
    }

    const search = await searchCaterBotSources(searchQueries, { maxResultsPerQuery: 5 })
    const candidateUrls = unique(search.results.map((result) => result.url)).slice(0, 30)

    // Scan You.com snippets for labelled dimensions before fetching any pages.
    // Guard 1: dimensionsFromText + plausibleDimensions must pass — same hardened
    //   logic as the catch-all fix; bare model-number digits are rejected.
    // Guard 2: snippet/title must share a common prefix of ≥6 alphanumeric chars
    // with the scanned model, in either direction. Accepts "sh120ebt" (result)
    // against "sh120ebtps" (plate) and vice versa, while blocking unrelated models.
    const compactModel = model.toLowerCase().replace(/[^a-z0-9]/g, "")
    const modelPrefixLen = Math.max(6, compactModel.length - 2)
    const modelPrefix = compactModel.slice(0, modelPrefixLen)
    let snippetDimensions: string | null = null
    let snippetWeightText: string | null = null
    for (const result of search.results) {
      const combined = `${result.title || ""} ${result.snippet || ""}`.trim()
      if (!combined) continue
      const compactCombined = combined.toLowerCase().replace(/[^a-z0-9]/g, "")
      const modelInResult =
        compactCombined.includes(compactModel) ||            // full model in result
        (modelPrefix.length >= 6 && compactCombined.includes(modelPrefix)) || // plate prefix in result
        (compactModel.length >= 6 && compactCombined.split(/[^a-z0-9]+/).some( // result token is prefix of plate model
          (tok) => tok.length >= 6 && compactModel.startsWith(tok)
        ))
      if (!modelInResult) continue
      const snippet = result.snippet || ""
      if (!snippetDimensions) {
        const dims = plausibleDimensions(dimensionsFromText(snippet))
        if (dims) snippetDimensions = snippet
      }
      if (!snippetWeightText) {
        const netKg = labelledKgFromText(snippet, ["net weight", "net wt", "product weight", "empty weight", "weight"])
        const grossKg = labelledKgFromText(snippet, ["gross weight", "gross wt", "shipping weight", "ship weight"])
        const anyKg = netKg ?? grossKg
        if (anyKg !== null && anyKg >= 5 && anyKg <= 2000) snippetWeightText = snippet
      }
      if (snippetDimensions && snippetWeightText) break
    }

    const validations: CaterBotSourceValidationResult[] = []

    for (const url of candidateUrls
      .sort((a, b) => sourcePriorityRank(a, brand) - sourcePriorityRank(b, brand))
      .slice(0, 18)) {
      const result = search.results.find((item) => item.url === url)
      const validation = await validateCaterBotProductSource({
        url,
        brand,
        model,
        equipmentType,
        fuelType,
        candidateTitle: result?.title,
        candidateSnippet: result?.snippet,
      })

      if (validation.valid) {
        validations.push(validation)
        if (validation.confidence === "high") break
      }
    }

    const selected =
      validations.sort((a, b) => b.score - a.score || sourcePriorityRank(a.url, brand) - sourcePriorityRank(b.url, brand))[0] ||
      null

    return {
      searchQueries,
      candidateUrls,
      selected,
      snippetDimensions,
      snippetWeightText,
      searchErrors: search.errors as string[],
      provider: search.provider as string | null,
    }
  }

  const timedOut = {
    searchQueries,
    candidateUrls: [] as string[],
    selected: null as null,
    snippetDimensions: null as string | null,
    snippetWeightText: null as string | null,
    searchErrors: ["Source lookup timed out — please check the model number and add a source link manually."] as string[],
    provider: null as string | null,
  }

  return Promise.race([
    runSearch(),
    new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), 28000)),
  ])
}
