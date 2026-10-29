"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AnswerTable } from "@/components/ai/answer-table";
import { AlertCircleIcon, SendIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
    <Card className="h-[calc(100vh-11rem)] min-h-[28rem] gap-0 py-0">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <SparklesIcon className="mx-auto mb-3 size-6 text-primary" />
            <p className="text-base font-medium">Ask about headcount and compensation</p>
            <p className="mt-1 text-sm text-muted-foreground">Answers are computed live from the employee database, in annual USD.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="rounded-full text-xs" onClick={() => ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "user" ? (
              <div className="max-w-[80%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{message.text}</div>
            ) : message.role === "error" ? (
              <div role="alert" className="flex max-w-[80%] items-center gap-2 rounded-lg rounded-bl-sm bg-destructive/10 px-3.5 py-2 text-sm text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                {message.text}
              </div>
            ) : (
              <div className="w-full max-w-[85%] rounded-lg rounded-bl-sm border bg-muted/40 px-3.5 py-2.5 text-sm">
                <p>{message.answer.answer}</p>
                {message.answer.table && <AnswerTable table={message.answer.table} unit={message.answer.unit} />}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant={message.answer.parser === "llm" ? "default" : "secondary"}>
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
            <div className="rounded-lg border px-3.5 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t p-3">
        <Input
          aria-label="Ask a question"
          placeholder="e.g. Average salary of engineers in the UK"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={pending}
          className="h-9"
        />
        <Button type="submit" size="lg" disabled={pending || question.trim().length < 3}>
          <SendIcon />
          Ask
        </Button>
      </form>
    </Card>
  );
}
