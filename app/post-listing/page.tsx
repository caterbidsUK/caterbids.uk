"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function PostListingPage() {
  const router = useRouter()

  const [quickText, setQuickText] = useState("")
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("Equipment")
  const [condition, setCondition] = useState("Used")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState<string | null>(null)

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function autoFill() {
    const text = quickText.toLowerCase()

    let newTitle = "Commercial Catering Equipment"
    let newCategory = "Equipment"
    let newCondition = "Used"
    let newDescription =
      "Commercial catering equipment suitable for UK catering businesses, cafés, takeaways, restaurants or mobile food operators."

    if (text.includes("fryer")) {
      const double = text.includes("double") ? "Double " : ""
      const gas = text.includes("gas") ? "Gas " : ""
      const electric = text.includes("electric") ? "Electric " : ""
      newTitle = `Commercial ${double}${gas || electric}Fryer`
      newDescription =
        "Commercial fryer suitable for takeaways, cafés, restaurants and food vans. Buyer should confirm working condition, gas/electric type, basket count, dimensions, service history and collection or delivery options."
    }

    if (text.includes("pizza") || text.includes("oven")) {
      newTitle = text.includes("pizza")
        ? "Commercial Pizza Oven"
        : "Commercial Catering Oven"
      newDescription =
        "Commercial oven suitable for takeaways, restaurants, cafés and catering businesses. Buyer should confirm power type, dimensions, working condition, service history and collection requirements."
    }

    if (text.includes("fridge") || text.includes("freezer")) {
      newTitle = text.includes("freezer")
        ? "Commercial Freezer"
        : "Commercial Catering Fridge"
      newDescription =
        "Commercial refrigeration unit suitable for catering businesses, cafés, restaurants and takeaways. Buyer should confirm temperature performance, size, condition and collection details."
    }

    if (text.includes("van") || text.includes("trailer") || text.includes("food truck")) {
      newTitle = text.includes("trailer")
        ? "Catering Trailer"
        : "Fully Fitted Catering Van"
      newCategory = "Vans"
      newDescription =
        "Mobile catering unit suitable for food vendors, events, markets and takeaway businesses. Buyer should check MOT status, mileage, fitted equipment, gas/electric setup, hygiene condition and paperwork before purchase."
    }

    if (text.includes("cafe") || text.includes("takeaway") || text.includes("restaurant") || text.includes("business")) {
      newTitle = text.includes("takeaway")
        ? "Takeaway Business For Sale"
        : "Catering Business For Sale"
      newCategory = "Businesses"
      newDescription =
        "Catering business opportunity suitable for buyers looking to take over an existing food operation. Seller should include rent, lease details, turnover, equipment included, location, staff details and reason for sale."
    }

    const priceMatch = quickText.match(/£?\s?\d+[,\d]*/i)
    const rawPrice = priceMatch ? priceMatch[0].replace(/\s/g, "") : ""
    const fixedPrice = rawPrice
      ? rawPrice.startsWith("£")
        ? rawPrice
        : `£${rawPrice}`
      : ""

    const places = [
      "Birmingham",
      "London",
      "Manchester",
      "Leeds",
      "Bristol",
      "Liverpool",
      "Sheffield",
      "Coventry",
      "Nottingham",
      "Glasgow",
      "Cardiff",
      "Leicester",
      "Wolverhampton",
    ]

    const foundLocation =
      places.find((place) => text.includes(place.toLowerCase())) || ""

    if (text.includes("good")) newCondition = "Good condition"
    if (text.includes("excellent")) newCondition = "Excellent condition"
    if (text.includes("new")) newCondition = "New"
    if (text.includes("spares") || text.includes("repair")) {
      newCondition = "For spares or repair"
    }

    setTitle(newTitle)
    setPrice(fixedPrice)
    setLocation(foundLocation)
    setCategory(newCategory)
    setCondition(newCondition)
    setDescription(newDescription)
  }

  function publishListing() {
    if (!title || !price || !location) {
      alert("Please add title, price and location")
      return
    }

    const id = Date.now().toString()
    const fixedPrice = price.startsWith("£") ? price : `£${price}`

    const listing = {
      id,
      title: title.trim(),
      price: fixedPrice.trim(),
      location: location.trim(),
      category,
      condition,
      description: description.trim(),
      image,
    }

    const existing = JSON.parse(
      localStorage.getItem("caterbids_listings") || "[]"
    )

    const isDuplicate = existing.some((item: any) => {
      return (
        item.title?.toLowerCase().trim() === listing.title.toLowerCase().trim() &&
        item.price?.toLowerCase().trim() === listing.price.toLowerCase().trim() &&
        item.location?.toLowerCase().trim() === listing.location.toLowerCase().trim()
      )
    })

    if (isDuplicate) {
      alert("This listing already exists")
      return
    }

    const updated = [listing, ...existing]

    localStorage.setItem("caterbids_listings", JSON.stringify(updated))
    localStorage.setItem("caterbids_current_listing", JSON.stringify(listing))

    router.push(`/listing?id=${id}`)
  }

  return (
    <main className="min-h-screen bg-[#001633] text-white px-4 py-6 max-w-md mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-white/70">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center">
        Cater<span className="text-[#FF6B00]">Bids</span>.UK
      </h1>

      <p className="text-center text-[#FF6B00] text-sm mb-6">
        BUY • SELL • SAVE
      </p>

      <div className="bg-white/10 p-4 rounded-xl mb-4">
        <h2 className="font-bold text-lg">Sell your item</h2>
        <p className="text-sm text-white/60">
          Add catering equipment, vans or businesses
        </p>
      </div>

      <div className="bg-[#1e2f4d] p-4 rounded-xl mb-4 border border-[#FF6B00]/30">
        <p className="text-[#FF6B00] font-bold mb-3">
          CaterBot Expert Fill
        </p>

        <label className="block cursor-pointer rounded-xl border border-dashed border-white/30 bg-white/10 p-4 text-center mb-3">
          <div className="text-2xl">📷</div>
          <div className="font-bold mt-1">Upload item photo</div>
          <div className="text-xs text-white/60">
            Tap here to choose an image
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        {image && (
          <img
            src={image}
            alt="Uploaded listing preview"
            className="w-full h-48 object-cover rounded-xl mb-3 border border-white/10"
          />
        )}

        <textarea
          placeholder="e.g. pizza oven £1200 London good condition"
          className="w-full p-3 rounded-lg bg-white/10 text-white mb-3"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
        />

        <button
          onClick={autoFill}
          className="w-full bg-[#FF6B00] py-3 rounded-lg font-bold"
        >
          Auto-Fill Listing
        </button>
      </div>

      <input
        placeholder="Listing title"
        className="w-full p-3 mb-3 rounded-lg bg-white/10"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Price £"
        className="w-full p-3 mb-3 rounded-lg bg-white/10"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <input
        placeholder="Location"
        className="w-full p-3 mb-3 rounded-lg bg-white/10"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <select
        className="w-full p-3 mb-3 rounded-lg bg-white/10"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option className="text-black">Equipment</option>
        <option className="text-black">Vans</option>
        <option className="text-black">Businesses</option>
      </select>

      <input
        placeholder="Condition"
        className="w-full p-3 mb-3 rounded-lg bg-white/10"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
      />

      <textarea
        placeholder="Description"
        className="w-full p-3 mb-4 rounded-lg bg-white/10"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        onClick={publishListing}
        className="w-full bg-[#FF6B00] py-3 rounded-xl font-bold text-lg"
      >
        Publish Listing
      </button>
    </main>
  )
}