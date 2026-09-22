"use client";

import { MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ConferenceEvent } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  mine: boolean;
}

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    author: "Dra. Elena Vásquez",
    text: "¡Bienvenidos a esta sesión! Pueden compartir sus preguntas aquí.",
    mine: false,
  },
  {
    id: "seed-2",
    author: "Mtro. Roberto Alemán",
    text: "Excelente presentación. ¿Alguna recomendación para futuras líneas de investigación?",
    mine: false,
  },
];

interface LiveChatSheetProps {
  /** Null = closed. When set, the sheet opens for that session. */
  event: ConferenceEvent | null;
  onOpenChange: (open: boolean) => void;
}

/* TODO(auth): commenting requires a lightweight participant sign-in
 * (Supabase session gate on the composer; read-only viewing stays public).
 * Considered, NOT built yet — evolution path:
 *   1. one-click OAuth (google | linkedin_oidc) via supabase.auth.signInWithOAuth
 *   2. profile cache in localStorage encrypted with WebCrypto (AES-GCM),
 *      key per-session — UX cache ONLY, never an auth boundary: the real
 *      session stays in the HttpOnly cookie managed by proxy.ts
 *   3. strong typing from generated Supabase DB types
 * TODO(realtime): replace DEMO_MESSAGES with a Supabase Realtime channel
 * (postgres_changes/insert on messages where session_id = event.id).
 * See README › "Files with TODOs".
 */

export function LiveChatSheet({ event, onOpenChange }: LiveChatSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset transcript + focus input each time a new session opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on event?.id only — re-running on other event fields would reset the transcript
  useEffect(() => {
    if (event) {
      setMessages([
        ...DEMO_MESSAGES,
        {
          id: `welcome-${Date.now()}`,
          author: "Moderadora",
          text: `La discusión en vivo de "${event.title}" ha comenzado.`,
          mine: false,
        },
      ]);
      // Small delay so the sheet finishes mounting before focusing.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on every message change is the intent — scroll target read via ref
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `mine-${Date.now()}`, author: "Tú", text, mine: true },
    ]);
    setDraft("");
  }

  return (
    <Sheet
      open={event !== null}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setDraft("");
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            Discusión en vivo
          </SheetTitle>
          <SheetDescription className="line-clamp-2">
            {event?.title}
            {event ? ` · ${event.startTime}–${event.endTime}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div
          aria-live="polite"
          role="log"
          aria-label="Mensajes de la discusión"
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                message.mine ? "ml-auto items-end" : "items-start",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {message.author}
              </span>
              <p
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  message.mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {message.text}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t p-3"
        >
          <Label htmlFor="chat-message" className="sr-only">
            Write a message
          </Label>
          <Input
            ref={inputRef}
            id="chat-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar mensaje"
            disabled={!draft.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
