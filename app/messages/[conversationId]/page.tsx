import MessagesClient from "../MessagesClient"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params

  return <MessagesClient initialConversationId={conversationId} mobileThreadMode />
}
