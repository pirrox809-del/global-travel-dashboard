'use client';

/**
 * ai-chat-input.tsx — Travel AI prompt input.
 *
 * Adapted from the 21st.dev "ai-chat-input" component, slimmed down for the
 * Travel AI chatbot: no external model icons, no attachments, no effort
 * selector. Keeps the signature animation set — spring expand/collapse pill,
 * morphing brand text, arrow/mic/stop morphing send button and the live
 * audio-wave visualizer during voice input (Web Speech API, client-side).
 */

import * as React from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

// ----------------------------------------------------------------------
// Transition Physics
// ----------------------------------------------------------------------
const SPRING_TRANSITION =
  'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
const SMOOTH_HEIGHT_TRANSITION = 'height 0.15s ease-out';

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------
function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = useState<number | 'auto'>('auto');
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      setWidth(spanRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{ width }}
    >
      <span ref={spanRef} className="invisible whitespace-nowrap px-1">
        {text}
      </span>
      <span
        key={text}
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap animate-in fade-in zoom-in-95 duration-300"
      >
        {text}
      </span>
    </span>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.75 6.5V7a4.25 4.25 0 0 0 8.5 0v-.5M7 11.25V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
export interface PromptInputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** True while the assistant is generating a reply — blocks sending. */
  busy?: boolean;
  /** Brand chip label (e.g. "Travel AI"); morphs to busyLabel while busy. */
  brandLabel?: string;
  /** Localized status label shown in the chip while busy (e.g. "Thinking…"). */
  busyLabel?: string;
  sendAria?: string;
  micAria?: string;
  stopAria?: string;
  promptAria?: string;
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      onSubmit,
      placeholder = 'Ask anything…',
      className,
      busy = false,
      brandLabel = 'Travel AI',
      busyLabel = 'Thinking…',
      sendAria = 'Send message',
      micAria = 'Use voice input',
      stopAria = 'Stop voice input',
      promptAria = 'Prompt',
    },
    ref
  ) => {
    const [expanded, setExpanded] = useState(false);
    const [isSmoothResize, setIsSmoothResize] = useState(false);
    const [localValue, setLocalValue] = useState('');

    // Voice states
    const [isRecording, setIsRecording] = useState(false);
    const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0));
    const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
    const valueRef = useRef('');

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);
    const recognitionRef = useRef<any>(null);
    const demoIntervalRef = useRef<number | null>(null);

    const [containerHeight, setContainerHeight] = useState(116);
    const [textareaHeight, setTextareaHeight] = useState(68);
    const [isScrolling, setIsScrolling] = useState(false);

    const value = localValue;
    const hasValue = value.trim() !== '';

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const topFadeRef = useRef<HTMLDivElement>(null);
    const bottomFadeRef = useRef<HTMLDivElement>(null);

    // Voice input needs the Web Speech API (Chrome/Edge/Safari).
    // Deferred to a rAF callback: post-hydration, avoids SSR mismatch
    // and satisfies the no-sync-setState-in-effect rule.
    useEffect(() => {
      const raf = requestAnimationFrame(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setHasVoiceSupport(Boolean(SR));
      });
      return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    const updateFades = () => {
      const el = textareaRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (topFadeRef.current) {
        topFadeRef.current.style.opacity = Math.min(scrollTop / 20, 1).toString();
      }
      if (bottomFadeRef.current) {
        const bottomScroll = scrollHeight - clientHeight - scrollTop;
        bottomFadeRef.current.style.opacity = Math.min(Math.max(bottomScroll - 16, 0) / 10, 1).toString();
      }
    };

    const handleValueChange = useCallback((val: string) => {
      setLocalValue(val);
    }, []);

    const expand = () => {
      setIsSmoothResize(false);
      setExpanded(true);
    };

    // --- Voice Recording Logic ---
    const stopRecording = useCallback(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (demoIntervalRef.current) {
        window.clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setIsRecording(false);
      setAudioData(new Array(5).fill(0));
    }, []);

    const startRecording = useCallback(async () => {
      setIsSmoothResize(false);
      setExpanded(true);

      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch {
        console.warn('Microphone denied or unavailable — continuing without visualizer.');
      }

      setIsRecording(true);

      if (stream) {
        streamRef.current = stream;

        // Web Audio API → 5-band visualizer
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVisualizer = () => {
            analyser.getByteFrequencyData(dataArray);
            const bands = new Array(5).fill(0);
            const step = Math.floor(dataArray.length / 5);
            for (let i = 0; i < 5; i++) {
              let sum = 0;
              for (let j = 0; j < step; j++) {
                sum += dataArray[i * step + j];
              }
              bands[i] = sum / step / 255;
            }
            setAudioData(bands);
            rafRef.current = requestAnimationFrame(updateVisualizer);
          };
          updateVisualizer();
        } catch {
          /* visualizer is optional */
        }
      } else {
        // Fallback simulated visualizer so the animation still plays
        demoIntervalRef.current = window.setInterval(() => {
          setAudioData(Array.from({ length: 5 }, () => Math.random() * 0.8 + 0.1));
        }, 100);
      }

      // Speech Recognition → live transcription into the textarea
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        let baseline = valueRef.current;

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            baseline += (baseline ? ' ' : '') + finalTranscript;
          }

          handleValueChange((baseline + (interimTranscript ? ' ' + interimTranscript : '')).trim());
        };

        recognition.onerror = () => stopRecording();
        recognition.onend = () => stopRecording();

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        stopRecording();
      }
    }, [handleValueChange, stopRecording]);

    // Keep textarea auto-scrolled to bottom while recording
    useEffect(() => {
      if (isRecording && textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, [value, isRecording]);

    // Cleanup mic/streams on unmount
    useEffect(() => {
      return () => {
        stopRecording();
      };
    }, [stopRecording]);

    useEffect(() => {
      if (expanded && !isRecording) {
        const timer = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [expanded, isRecording]);

    // Auto-grow textarea (max 160px, then scroll)
    useEffect(() => {
      if (!textareaRef.current) return;
      const el = textareaRef.current;

      const currentHeight = el.style.height;
      el.style.transition = 'none';
      el.style.height = '0px';
      const scrollHeight = el.scrollHeight;
      el.style.height = currentHeight;
      void el.offsetHeight;
      el.style.transition = '';

      const newHeight = Math.max(68, Math.min(scrollHeight, 160));
      el.style.height = `${newHeight}px`;

      setTextareaHeight(newHeight);
      setIsScrolling(scrollHeight > 160);

      setTimeout(updateFades, 0);
    }, [value, expanded]);

    const handleSubmit = () => {
      if (value.trim() === '' || busy) return;
      setIsSmoothResize(false);
      onSubmit(value);
      handleValueChange('');
      setExpanded(false);
      stopRecording();
    };

    const showArrow = hasValue && !isRecording;
    const showStop = isRecording;
    const showMic = !hasValue && !isRecording && hasVoiceSupport;

    const onActionButtonClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isRecording) {
        stopRecording();
      } else if (hasValue) {
        handleSubmit();
      } else if (hasVoiceSupport) {
        startRecording();
      }
    };

    return (
      <div
        ref={ref}
        className={cn('relative flex w-full flex-col', className)}
      >
        {/* Main Input Card */}
        <div
          onMouseDown={(e) => {
            const isTextarea = e.target === textareaRef.current;
            if (expanded && !isTextarea && !isRecording) {
              e.preventDefault();
              textareaRef.current?.focus();
            }
          }}
          style={{
            borderRadius: 20,
            height: expanded ? containerHeight : 48,
            transition: isSmoothResize ? SMOOTH_HEIGHT_TRANSITION : SPRING_TRANSITION,
            overflow: expanded ? 'visible' : 'hidden',
          }}
          className={cn(
            'relative w-full border border-border bg-card shadow-sm focus-within:border-ring/40 focus-within:ring-1 focus-within:ring-ring/20 hover:border-border/80 z-10',
            expanded ? 'cursor-text' : 'cursor-default'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onScroll={updateFades}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            aria-label={promptAria}
            disabled={isRecording}
            style={{
              transition: isSmoothResize
                ? 'height 0.15s ease-out'
                : 'opacity 0.3s ease-out, transform 0.3s ease-out, height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            className={cn(
              'scroll-soft absolute top-0 inset-x-0 z-[1] w-full resize-none bg-transparent pl-4 pr-12 py-3.5 text-sm leading-[22px] text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/80 cursor-text',
              expanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none',
              isScrolling ? 'overflow-y-auto' : 'overflow-y-hidden',
              isRecording && 'pointer-events-none'
            )}
          />

          <div
            ref={topFadeRef}
            className="absolute left-4 right-12 top-0 z-[2] h-8 bg-gradient-to-b from-card via-card/90 to-transparent pointer-events-none"
          />
          <div
            ref={bottomFadeRef}
            className="absolute left-4 right-12 z-[2] h-8 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none"
            style={{
              opacity: 0,
              top: `${textareaHeight - 32}px`,
              transition: isSmoothResize ? 'top 0.15s ease-out' : 'top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          />

          {/* Collapsed pill — shows the placeholder */}
          <button
            type="button"
            onClick={expand}
            style={{ transition: isSmoothResize ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
            className={cn(
              'absolute inset-x-0 top-0 z-[1] cursor-text pl-4 pr-12 py-[15px] text-left text-sm font-medium leading-[17px] text-muted-foreground/80 outline-none',
              !expanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-105 translate-y-1 pointer-events-none'
            )}
            aria-label={promptAria}
          >
            {placeholder}
          </button>

          {/* Bottom Actions — brand chip */}
          <div
            className={cn(
              'absolute bottom-2 left-3 right-12 z-[10] flex items-center gap-1 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]',
              expanded && !isRecording ? 'opacity-100 blur-0 translate-y-0 pointer-events-auto' : 'opacity-0 blur-sm translate-y-2 pointer-events-none'
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-foreground/50 select-none',
                busy && 'text-amber-600 dark:text-amber-400'
              )}
              aria-live="polite"
            >
              <Plane className={cn('size-3.5 transition-transform duration-500', busy && 'animate-pulse')} />
              <span className="text-xs font-semibold">
                <MorphingText text={busy ? busyLabel : brandLabel} />
              </span>
            </span>
          </div>

          {/* Audio Wave Visualizer — left of the action button while recording */}
          <div
            className={cn(
              'absolute right-12 bottom-2 z-[10] flex h-8 items-center justify-end gap-[3px] transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]',
              isRecording ? 'w-16 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4 pointer-events-none'
            )}
          >
            {audioData.map((val, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary transition-[height] duration-75 ease-out"
                style={{ height: `${Math.max(4, val * 24)}px` }}
              />
            ))}
          </div>

          {/* Morphing action button: arrow / mic / stop */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={onActionButtonClick}
            disabled={busy && !isRecording}
            aria-label={showStop ? stopAria : showArrow ? sendAria : micAria}
            style={{ borderRadius: 9999 }}
            className={cn(
              'absolute right-2 bottom-2 z-[10] flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground transition-all duration-300 hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              busy && !isRecording && 'opacity-50 pointer-events-none'
            )}
          >
            <span className="relative flex h-full w-full items-center justify-center">
              <span className={cn('absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]', showArrow ? 'opacity-100 scale-100 rotate-0 blur-none' : 'opacity-0 scale-50 rotate-45 blur-[1px] pointer-events-none')}>
                <ArrowUpIcon />
              </span>
              <span className={cn('absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]', showMic ? 'opacity-100 scale-100 rotate-0 blur-none' : 'opacity-0 scale-50 -rotate-45 blur-[1px] pointer-events-none')}>
                <MicIcon />
              </span>
              <span className={cn('absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]', showStop ? 'opacity-100 scale-100 rotate-0 blur-none' : 'opacity-0 scale-50 rotate-45 blur-[1px] pointer-events-none')}>
                <StopIcon />
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }
);

PromptInput.displayName = 'PromptInput';
