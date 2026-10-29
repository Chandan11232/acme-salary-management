"use client";

import { AlertCircleIcon, ArrowRightIcon, CheckIcon, MessageSquareQuoteIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AnswerTable } from "@/components/ai/answer-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// The answer "screen" stays dark in both themes, like a drafting-table display.
const SCREEN = "bg-[#1a1a17] text-[#fffef8]/80 [background-image:radial-gradient(rgb(255_254_248/0.07)_1px,transparent_1px)] [background-size:14px_14px]";

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
    <section className="rounded-xl rule bg-lilac p-4 shadow-hard sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-ink" aria-hidden />
          Live compensation data
        </p>
        <p className="eyebrow text-muted-foreground">10,000 employees · USD</p>
      </div>

      <div className={`${SCREEN} h-[min(60vh,34rem)] min-h-[22rem] overflow-y-auto rounded-sm border-[1.5px] border-ink p-4 sm:p-5`} aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <p className="eyebrow mb-4 text-[#fffef8]/60">Try one of these</p>
            <ul className="divide-y divide-[#fffef8]/10 border-y border-[#fffef8]/10">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    className="group flex w-full items-center justify-between gap-4 py-2.5 text-left text-sm text-[#fffef8]/85 transition-colors hover:text-orange"
                  >
                    {s}
                    <ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="flex max-w-[85%] items-start gap-2.5 rounded-sm border-[1.5px] border-ink bg-[#fffef8] px-3.5 py-2.5 text-[15px] font-medium text-[#1a1a17] shadow-[4px_4px_0_var(--orange)]">
                    <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0" />“{message.text}”
                  </div>
                </div>
              ) : message.role === "error" ? (
                <div key={message.id} role="alert" className="flex items-center gap-2 text-sm text-[#f97066]">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  {message.text}
                </div>
              ) : (
                <div key={message.id} className="max-w-[92%] border-l-2 border-orange pl-4">
                  <p className="text-[15px] leading-relaxed text-[#fffef8]">{message.answer.answer}</p>
                  {message.answer.table && <AnswerTable table={message.answer.table} unit={message.answer.unit} />}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="eyebrow flex items-center gap-1 text-[10px] text-orange">
                      <CheckIcon className="size-3" />
                      {message.answer.parser === "llm" ? "Parsed by Claude" : "Rule-based parser"}
                    </span>
                    {message.answer.interpretation && (
                      <span className="font-mono text-[11px] text-[#fffef8]/50">{message.answer.interpretation}</span>
                    )}
                  </div>
                </div>
              ),
            )}
            {pending && <p className="eyebrow animate-pulse text-[#fffef8]/60">Computing…</p>}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input
          aria-label="Ask a question"
          placeholder="e.g. Average salary of engineers in the UK"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={pending}
          className="h-11 border-[1.5px] border-ink text-[15px]"
        />
        <Button type="submit" size="lg" className="h-11 gap-4 px-5" disabled={pending || question.trim().length < 3}>
          Ask
          <ArrowRightIcon />
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Answers are computed in the database; the model never sees salaries and never writes SQL.</p>
    </section>
  );
}
