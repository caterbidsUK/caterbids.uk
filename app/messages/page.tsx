import MessagesClient from "./MessagesClient"
import { getFreeListingsRemaining } from "@/lib/counters"

export default async function MessagesPage() {
  const { remaining: freeRemaining } = await getFreeListingsRemaining()
  return <MessagesClient freeRemaining={freeRemaining} />
}
