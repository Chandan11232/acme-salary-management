"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AnswerTable } from "@/components/ai/answer-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { AIAnswer } from "@/lib/types";

type Message = { id: number; role: "user"; text: string } | { id: number; role: "assistant"; answer: AIAnswer } | { id: number; role: "error"; text: string };

const SUGGESTIONS = [
  "What is the average salary in Engineering in Germany?",
  "Total payroll by country",
  "Top 5 earners in Sales",
  "How many contractors do we have in India?",
  "Which department has the highest median salary?",
  "Average bonus by department",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || pending) return;
    setQuestion("");
    setPending(true);
    setMessages((all) => [...all, { id: nextId.current++, role: "user", text: trimmed }]);
    try {
      const answer = await api.askAssistant(trimmed);
      setMessages((all) => [...all, { id: nextId.current++, role: "assistant", answer }]);
    } catch (err) {
      setMessages((all) => [...all, { id: nextId.current++, role: "error", text: (err as Error).message }]);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Card className="flex h-[calc(100vh-11rem)] min-h-[28rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <p className="text-base font-medium">Ask about headcount and compensation</p>
            <p className="mt-1 text-sm text-fg-muted">Answers are computed live from the employee database, in annual USD.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-fg-muted transition hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "user" ? (
              <div className="max-w-[80%] rounded-lg rounded-br-sm bg-accent px-3.5 py-2 text-sm text-accent-fg">{message.text}</div>
            ) : message.role === "error" ? (
              <div role="alert" className="max-w-[80%] rounded-lg rounded-bl-sm bg-danger-soft px-3.5 py-2 text-sm text-danger">
                ⚠ {message.text}
              </div>
            ) : (
              <div className="w-full max-w-[85%] rounded-lg rounded-bl-sm border border-line bg-surface-muted/40 px-3.5 py-2.5 text-sm">
                <p>{message.answer.answer}</p>
                {message.answer.table && <AnswerTable table={message.answer.table} unit={message.answer.unit} />}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
                  <Badge tone={message.answer.parser === "llm" ? "accent" : "neutral"}>
                    {message.answer.parser === "llm" ? "Parsed by Claude" : "Rule-based parser"}
                  </Badge>
                  {message.answer.interpretation && <span>Interpreted as: {message.answer.interpretation}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-line px-3.5 py-2 text-sm text-fg-muted">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <Input
          aria-label="Ask a question"
          placeholder="e.g. Average salary of engineers in the UK"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || question.trim().length < 3}>
          Ask
        </Button>
      </form>
    </Card>
  );
}
