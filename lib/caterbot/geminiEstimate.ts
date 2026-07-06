type GeminiSpecEstimate = {
  weight_kg: number | null
  height_cm: number | null
  width_cm: number | null
  depth_cm: number | null
}

function validDim(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v) && v >= 5 && v <= 500
}

function validWeight(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v) && v >= 1 && v <= 3000
}

export async function askGeminiForMissingSpecs({
  brand,
  model,
  equipmentType,
  needsDimensions,
  needsWeight,
}: {
  brand: string
  model: string
  equipmentType: string
  needsDimensions: boolean
  needsWeight: boolean
}): Promise<GeminiSpecEstimate | null> {
  const apiKey = process.env.AI_VISION_API_KEY
  if (!apiKey?.startsWith("AIza")) return null
  if (!needsDimensions && !needsWeight) return null

  const fields: string[] = []
  if (needsDimensions) fields.push("height_cm, width_cm, depth_cm (in centimetres, converted from mm if needed)")
  if (needsWeight) fields.push("weight_kg (net weight in kg)")

  const prompt = `You are a catering equipment database.
For ${brand} ${model}${equipmentType ? ` (${equipmentType})` : ""}, provide ONLY the following fields from the manufacturer's specification sheet: ${fields.join("; ")}.

Return ONLY strict JSON with numeric values (not strings). Return null for any field you are not fully confident about:
{"height_cm": null, "width_cm": null, "depth_cm": null, "weight_kg": null}

Rules:
- Only return values you are certain are correct for this exact model.
- null means "I don't know" — prefer null over a guess.
- Do not return values outside these plausible ranges: dimensions 5–500 cm, weight 1–3000 kg.`

  const geminiModel = process.env.AI_VISION_MODEL || "gemini-2.5-flash"

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.0,
          },
        }),
      }
    )

    if (!response.ok) return null
    const data = await response.json()
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== "string" || !text) return null

    const trimmed = text.trim()
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const parsed = JSON.parse(fenced?.[1] ?? trimmed) as Record<string, unknown>

    const toNum = (v: unknown) => (typeof v === "number" ? v : null)
    const raw: GeminiSpecEstimate = {
      height_cm: toNum(parsed.height_cm),
      width_cm: toNum(parsed.width_cm),
      depth_cm: toNum(parsed.depth_cm),
      weight_kg: toNum(parsed.weight_kg),
    }

    return {
      height_cm: validDim(raw.height_cm) ? raw.height_cm : null,
      width_cm: validDim(raw.width_cm) ? raw.width_cm : null,
      depth_cm: validDim(raw.depth_cm) ? raw.depth_cm : null,
      weight_kg: validWeight(raw.weight_kg) ? raw.weight_kg : null,
    }
  } catch {
    return null
  }
}
