import { ChatPanel } from "@/components/ai/chat-panel";
import { PageHeader } from "@/components/common/page-header";

export const metadata = { title: "Ask AI · ACME Pay" };

export default function AssistantPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        reference="C3"
        eyebrow="Compensation assistant"
        title={
          <>
            Ask it. <span className="text-orange">Get the number.</span>
          </>
        }
        description="Plain-English questions, answered from live data. Every answer shows how the question was interpreted."
      />
      <ChatPanel />
    </div>
  );
}
