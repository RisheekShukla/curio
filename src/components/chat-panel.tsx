"use client";

import { ArrowUp, Bookmark, BookmarkCheck, Info, Loader2, MessageSquarePlus, RotateCw, Sparkles, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscoveryImage } from "@/components/discovery-image";
import { useOnline } from "@/components/hooks";
import { useCurio } from "@/components/providers/curio-provider";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { LIMITS } from "@/lib/ai/types";
import { errorMessage } from "@/lib/client/api-error";
import type { Conversation, Discovery, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Pending {
  text: string;
  starter: boolean;
  error: string | null;
}

function QuestionChips({ questions, onPick, disabled }: { questions: string[]; onPick: (q: string) => void; disabled: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {questions.map((q) => (
        <li key={q}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-left text-sm transition-colors hover:border-foreground/30 hover:bg-muted disabled:opacity-50"
            data-testid="chat-question"
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AssistantMessage({ message, onPin }: { message: Message; onPin: () => void }) {
  return (
    <div className="group animate-rise" data-testid="assistant-message">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-accent" aria-hidden />
        <span>Curio</span>
        {message.isMock && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium" data-testid="demo-badge">
            Demo response
          </span>
        )}
      </div>
      <div className="text-[15px] leading-relaxed text-foreground/90">
        <RichText text={message.content} />
      </div>
      <button
        type="button"
        onClick={onPin}
        aria-pressed={message.pinned}
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          message.pinned && "text-accent",
        )}
      >
        {message.pinned ? <BookmarkCheck className="size-3.5 animate-pop" aria-hidden /> : <Bookmark className="size-3.5" aria-hidden />}
        {message.pinned ? "Saved insight" : "Save insight"}
      </button>
    </div>
  );
}

export function ChatPanel({
  discovery,
  initialConversationId,
  initialAsk,
  autoFocus,
  onConversationChange,
}: {
  discovery: Discovery;
  initialConversationId: string | null;
  initialAsk: string | null;
  autoFocus: boolean;
  onConversationChange: (id: string | null) => void;
}) {
  const { api, aiMode } = useCurio();
  const online = useOnline();
  const conversationRef = useRef<Conversation | null>(null);
  const setConversation = useCallback((c: Conversation | null) => {
    conversationRef.current = c;
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [draft, setDraft] = useState("");
  const [extraQuestions, setExtraQuestions] = useState<{ list: string[]; isMock: boolean } | null>(null);
  const [questionsState, setQuestionsState] = useState<"idle" | "loading" | "error">("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const sendingRef = useRef(false);

  const send = useCallback(
    async (text: string, starter = false) => {
      const content = text.trim();
      if (!api || !content || sendingRef.current) return;
      sendingRef.current = true;
      setPending({ text: content, starter, error: null });
      try {
        let conv = conversationRef.current;
        if (!conv) {
          conv = (await api.openConversation(discovery.id)).conversation;
          setConversation(conv);
          onConversationChange(conv.id);
        }
        const { userMessage, assistantMessage } = await api.sendMessage(conv.id, content, { starter });
        setMessages((m) => [...m, userMessage, assistantMessage]);
        setPending(null);
        setDraft((d) => (d.trim() === content ? "" : d));
      } catch (err) {
        setPending({ text: content, starter, error: errorMessage(err, "The answer couldn't be loaded.") });
      } finally {
        sendingRef.current = false;
      }
    },
    [api, discovery.id, onConversationChange, setConversation],
  );

  const load = useCallback(async () => {
    if (!api) return;
    try {
      let thread = null;
      if (initialConversationId) {
        thread = await api.getConversation(initialConversationId).catch(() => null);
        if (thread && thread.discovery.id !== discovery.id) thread = null;
      }
      thread ??= await api.findConversation(discovery.id);
      setConversation(thread?.conversation ?? null);
      setMessages(thread?.messages ?? []);
      setStatus("ready");
      return thread;
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn't load this conversation."));
      setStatus("error");
      return undefined;
    }
  }, [api, discovery.id, initialConversationId, setConversation]);

  useEffect(() => {
    if (!api || started.current) return;
    started.current = true;
    void load().then((thread) => {
      if (thread === undefined) return;
      if (thread) onConversationChange(thread.conversation.id);
      if (initialAsk) void send(initialAsk, true);
      else if (autoFocus) inputRef.current?.focus();
    });
  }, [api, load, initialAsk, autoFocus, send, onConversationChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  const startNew = async () => {
    if (!api || sendingRef.current) return;
    try {
      const thread = await api.openConversation(discovery.id, true);
      setConversation(thread.conversation);
      setMessages([]);
      setPending(null);
      onConversationChange(thread.conversation.id);
      inputRef.current?.focus();
    } catch (err) {
      setPending({ text: "", starter: false, error: errorMessage(err) });
    }
  };

  const togglePin = async (message: Message) => {
    if (!api) return;
    setMessages((ms) => ms.map((m) => (m.id === message.id ? { ...m, pinned: !m.pinned } : m)));
    try {
      await api.setPinned(message.id, !message.pinned);
    } catch {
      setMessages((ms) => ms.map((m) => (m.id === message.id ? { ...m, pinned: message.pinned } : m)));
    }
  };

  const loadMoreQuestions = async () => {
    if (!api) return;
    setQuestionsState("loading");
    try {
      const result = await api.getMoreQuestions(discovery.id);
      setExtraQuestions({ list: result.questions, isMock: result.isMock });
      setQuestionsState("idle");
    } catch {
      setQuestionsState("error");
    }
  };

  const busy = !!pending && !pending.error;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const canSend = online && !busy && draft.trim().length > 0 && draft.length <= LIMITS.messageChars;

  return (
    <section
      aria-label={`Conversation about ${discovery.title}`}
      className="flex min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-border bg-card lg:h-[calc(100dvh-4rem)]"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="size-10 shrink-0 overflow-hidden rounded-xl">
          <DiscoveryImage discovery={discovery} sizes="40px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Exploring</p>
          <p className="truncate font-serif text-base">{discovery.title}</p>
        </div>
        {aiMode === "mock" && (
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:inline" title="No AI provider is configured; replies are templates.">
            Demo AI
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={startNew} disabled={busy || messages.length === 0} title="Start a new conversation">
          <MessageSquarePlus className="size-4" aria-hidden />
          <span className="hidden sm:inline">New</span>
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
        {status === "loading" && (
          <div className="space-y-3" aria-label="Loading conversation">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {status === "error" && <ErrorState message={loadError} onRetry={() => { setStatus("loading"); void load(); }} />}

        {status === "ready" && messages.length === 0 && !pending && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">
              <p className="mb-1 font-medium">Let’s explore “{discovery.title}”.</p>
              <p className="text-muted-foreground">
                Ask anything — how it works, why it matters, what’s still uncertain. I’ll stay anchored to this topic
                and tell you when something is debated or I’m unsure.
              </p>
            </div>
            <QuestionChips questions={discovery.starterQuestions} onPick={(q) => void send(q, true)} disabled={!online} />
            {extraQuestions && (
              <>
                {extraQuestions.isMock && <p className="text-xs text-muted-foreground">Template questions (demo mode)</p>}
                <QuestionChips questions={extraQuestions.list} onPick={(q) => void send(q, true)} disabled={!online} />
              </>
            )}
            {!extraQuestions && (
              <Button variant="ghost" size="sm" onClick={loadMoreQuestions} disabled={questionsState === "loading" || !online}>
                {questionsState === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                {questionsState === "error" ? "Couldn't load questions — try again" : "Suggest more questions"}
              </Button>
            )}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto w-fit max-w-[85%] animate-rise rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[15px] text-background">
              {m.content}
            </div>
          ) : (
            <AssistantMessage key={m.id} message={m} onPin={() => void togglePin(m)} />
          ),
        )}

        {pending && pending.text && (
          <>
            <div className="ml-auto w-fit max-w-[85%] animate-rise rounded-2xl rounded-br-md bg-foreground/85 px-4 py-2.5 text-[15px] text-background">
              {pending.text}
            </div>
            {pending.error ? (
              <div role="alert" className="animate-fade rounded-2xl border border-border p-4 text-sm">
                <p className="text-muted-foreground">{pending.error}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { const p = pending; setPending(null); void send(p.text, p.starter); }} disabled={!online}>
                    <RotateCw className="size-4" aria-hidden /> Retry
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(pending.text); setPending(null); }}>
                    Edit question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex animate-fade items-center gap-2 text-sm text-muted-foreground" role="status">
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-dot rounded-full bg-accent" style={{ animationDelay: `${i * 160}ms` }} />
                  ))}
                </span>
                Thinking…
              </div>
            )}
          </>
        )}
        {pending && !pending.text && pending.error && <ErrorState message={pending.error} />}

        {!pending && lastAssistant && lastAssistant.suggestions.length > 0 && messages.at(-1)?.id === lastAssistant.id && (
          <div className="animate-fade" style={{ animationDelay: "200ms" }}>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Keep exploring</p>
            <QuestionChips questions={lastAssistant.suggestions} onPick={(q) => void send(q)} disabled={!online} />
          </div>
        )}
      </div>

      <form
        className="border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) void send(draft);
        }}
      >
        {!online && (
          <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <WifiOff className="size-3.5" aria-hidden /> AI chat needs an internet connection.
          </p>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-foreground/40">
          <label htmlFor="chat-input" className="sr-only">
            Ask a follow-up question
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void send(draft);
              }
            }}
            rows={1}
            maxLength={LIMITS.messageChars}
            placeholder={`Ask about ${discovery.title.toLowerCase().slice(0, 40)}…`}
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" variant="accent" disabled={!canSend} aria-label="Send question">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowUp className="size-4" aria-hidden />}
          </Button>
        </div>
        <p className="mt-2 flex justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          <span>
            <Info className="mr-1 inline size-3" aria-hidden />
            AI can make mistakes and can’t browse the web. Check important facts.
          </span>
          {draft.length > LIMITS.messageChars * 0.8 && (
            <span>
              {draft.length}/{LIMITS.messageChars}
            </span>
          )}
        </p>
      </form>
    </section>
  );
}
