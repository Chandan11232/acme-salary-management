import { ChatPanel } from "@/components/ai/chat-panel";

export const metadata = { title: "AI Assistant · ACME Compensation" };

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-fg-muted">Ask compensation questions in plain English.</p>
      </div>
      <ChatPanel />
    </div>
  );
}
