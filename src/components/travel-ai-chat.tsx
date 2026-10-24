'use client';

/**
 * travel-ai-chat.tsx — Travel AI, the site chatbot.
 *
 * Floating action button (bottom-right) that opens an animated chat panel.
 * The panel renders the conversation, a typing indicator, and the animated
 * PromptInput from ai-chat-input.tsx. Replies come from POST /api/chat
 * (z-ai LLM with a system prompt that knows the whole website).
 * Deliberately light: in-memory messages, no persistence, no streaming.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInput } from '@/components/ui/ai-chat-input';
import { useLanguage } from '@/components/language-provider';
import type { MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PANEL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };

export function TravelAIChat() {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(true); // subtle attention nudge on first load
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  // Keep busyRef in sync so rapid submissions see the latest state.
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // One-shot FAB nudge animation after a short delay.
  useEffect(() => {
    const timer = setTimeout(() => setNudge(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll the message list to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busyRef.current) return;

    const history = [...messages, { role: 'user' as const, content }];
    setMessages(history);
    setBusy(true);

    // Distinguish failure kinds so each gets a clear, localized message.
    let failure: 'not_configured' | 'rate_limited' | 'generic' = 'generic';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        if (res.status === 503 || data?.error === 'not_configured') failure = 'not_configured';
        else if (res.status === 429 || data?.error === 'rate_limited') failure = 'rate_limited';
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply) }]);
    } catch {
      const key: MessageKey =
        failure === 'not_configured' ? 'chat.unconfigured'
        : failure === 'rate_limited' ? 'chat.ratelimit'
        : 'chat.error';
      setMessages((prev) => [...prev, { role: 'assistant', content: t(key) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating action button — logo ↔ X morph */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t('chat.close') : t('chat.open')}
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.5, y: 16 }}
        animate={
          nudge && !open
            ? { opacity: 1, scale: [1, 1.08, 1], y: 0 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ duration: 0.5, delay: 0.8, scale: { duration: 0.6 } }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg shadow-black/20 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Soft ping to draw attention (hidden once opened) */}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-foreground/20 [animation-duration:2.5s]" aria-hidden="true" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              <X className="size-5" />
            </motion.span>
          ) : (
            <motion.span
              key="logo"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              <Image src="/travel-ai-logo.png" alt="" width={28} height={28} aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="travel-ai-panel"
            role="dialog"
            aria-label="Travel AI"
            initial={{ opacity: 0, y: 24, scale: 0.94, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94, transition: { duration: 0.18 } }}
            transition={PANEL_SPRING}
            className="fixed bottom-20 right-4 z-50 flex h-[min(62vh,540px)] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl sm:right-5"
          >
            {/* Header */}
            <header className="flex items-center gap-2.5 border-b border-border/50 bg-background/40 px-4 py-3">
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <Image src="/travel-ai-logo.png" alt="" width={18} height={18} aria-hidden />
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold">Travel AI</p>
                <p className="truncate text-[11px] text-muted-foreground">{t('chat.subtitle')}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setMessages([])}
                disabled={messages.length === 0 || busy}
                aria-label={t('chat.clear')}
                title={t('chat.clear')}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label={t('chat.close')}
              >
                <X className="size-4" />
              </Button>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              aria-live="polite"
              className="scroll-soft flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {/* Greeting bubble (static, always first) */}
              <Bubble>
                <Image
                  src="/travel-ai-logo.png"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden
                  className="mr-1.5 inline -translate-y-px dark:invert"
                />
                {t('chat.greeting')}
              </Bubble>

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <Bubble key={i}>{m.content}</Bubble>
                ),
              )}

              {/* Typing indicator */}
              {busy && (
                <Bubble ariaLabel={t('chat.typing')}>
                  <span className="flex items-center gap-1 py-0.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.9s' }}
                      />
                    ))}
                  </span>
                </Bubble>
              )}
            </div>

            {/* Animated prompt input */}
            <div className="border-t border-border/50 bg-background/30 p-3">
              <PromptInput
                onSubmit={send}
                placeholder={t('chat.placeholder')}
                busy={busy}
                brandLabel="Travel AI"
                busyLabel={t('chat.typing')}
                sendAria={t('chat.send')}
                micAria={t('chat.voice')}
                stopAria={t('chat.stopVoice')}
                promptAria={t('chat.prompt')}
                voiceLocale={locale}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

/** Assistant bubble — muted card with soft entrance animation. */
function Bubble({ children, ariaLabel, className }: { children: React.ReactNode; ariaLabel?: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex justify-start')}
    >
      <div
        aria-label={ariaLabel}
        className={cn(
          'max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground',
          className,
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
