import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, MessageSquare, Send, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatMessage } from '../types';
import { useAppStore } from '../context/AppStoreContext';
import { formatIndianPrice } from '../utils/realEstateLogic';

const QUICK_PROMPTS = [
  'Estimate monthly EMI for ₹2.85 Cr at 8.5% for 20 years',
  'Compare Whitefield Varthur vs Devanahalli Airport Corridor outlook',
  'What Karnataka RERA & BBMP/BIAAPA checks should a buyer verify?',
];

export function GeminiChatDrawer() {
  const { properties } = useAppStore();
  const { pathname } = useLocation();
  const isPropertyPage = pathname.includes('/p/');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Welcome to EstateDirect Concierge. Ask me about any residence in the catalog, Indian stamp duty & EMI math, locality comparisons, or RERA due diligence.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const catalogSummary = properties
    .filter((p) => p.published)
    .slice(0, 8)
    .map(
      (p) =>
        `${p.propertyCode}: ${p.title} (${p.locality}, ${p.city}) — ${formatIndianPrice(
          p.price,
          p.kind
        )}, ${p.beds}BHK, ${p.sqft} sq ft, RERA ${p.reraNumber}`
    )
    .join('\n');

  const sendMessage = async (textOverride?: string, useFastLite?: boolean) => {
    const content = (textOverride ?? input).trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    const runFast = useFastLite ?? fastMode;

    try {
      const endpoint = runFast ? '/api/ai/quick' : '/api/ai/chat';
      const body = runFast
        ? { task: 'quick_answer', prompt: content, context: catalogSummary }
        : {
            messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
            contextSummary: catalogSummary,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Assistant could not respond right now.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.text || 'I could not formulate a response.',
          timestamp: new Date().toISOString(),
          model: data.model,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text:
            err instanceof Error
              ? err.message
              : 'Unable to reach the advisory service. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Launcher button (compact icon in left gutter on property detail pages for zero overlap) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open EstateDirect Property Concierge"
        aria-label="Open EstateDirect Property Concierge"
        className={`fixed z-40 inline-flex items-center justify-center rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold shadow-editorial-lg hover:bg-[#261E19] transition-transform hover:scale-[1.04] active:scale-[0.98] border border-[#C9A96E]/45 ${
          isPropertyPage
            ? 'w-12 h-12 bottom-[86px] right-4 lg:bottom-6 lg:left-5 lg:right-auto'
            : 'gap-2.5 px-3.5 sm:px-4 py-3 bottom-6 right-5'
        }`}
      >
        <MessageSquare className="w-4 h-4 text-[#C9A96E]" />
        {!isPropertyPage && <span className="hidden sm:inline">Property Concierge</span>}
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="EstateDirect Property Concierge Chat"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-[#17120F]/50"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full max-w-[430px] h-full bg-[#FAF7F2] border-l border-[#17120F]/10 flex flex-col shadow-editorial-lg"
            >
              {/* Header */}
              <div className="px-6 py-5 bg-[#17120F] text-[#FAF7F2] flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">
                    Private Advisory
                  </p>
                  <h2 className="text-lg font-bold tracking-tight">EstateDirect Concierge</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFastMode((v) => !v)}
                    aria-pressed={fastMode}
                    title="Toggle low-latency quick answers"
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      fastMode
                        ? 'bg-[#C9A96E] text-[#17120F]'
                        : 'bg-white/10 text-[#FAF7F2]/80 hover:bg-white/15'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Fast
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close concierge chat"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#FAF7F2]/75 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable conversation thread */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-[#17120F] text-[#FAF7F2]'
                          : 'bg-white text-[#17120F] border border-[#17120F]/[0.08]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-[22px] bg-white border border-[#17120F]/[0.08] px-4 py-3 inline-flex items-center gap-2 text-xs text-[#17120F]/65">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9D7D44]" />
                      Thinking...
                    </div>
                  </div>
                )}

                {messages.length <= 2 && !sending && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-medium text-[#17120F]/55">Suggested questions</p>
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt, true)}
                        className="block w-full text-left px-3.5 py-2.5 rounded-2xl bg-white border border-[#17120F]/10 text-xs font-medium text-[#17120F]/85 hover:border-[#C9A96E] transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
                className="p-4 bg-white border-t border-[#17120F]/[0.08] flex items-center gap-2"
              >
                <label htmlFor="concierge-input" className="sr-only">
                  Ask EstateDirect Concierge
                </label>
                <input
                  id="concierge-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about listings, EMI, localities..."
                  className="flex-1 rounded-full bg-[#FAF7F2] border border-[#17120F]/12 px-4 py-2.5 text-sm text-[#17120F] placeholder:text-[#17120F]/45"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-full bg-[#17120F] text-[#FAF7F2] flex items-center justify-center hover:bg-[#261E19] disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
