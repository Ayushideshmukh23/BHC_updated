'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const AvaAvatar = () => (
  <img
    src="https://img.freepik.com/premium-photo/3d-girl-cartoon-character-with-glasses_1338461-823.jpg"
    alt="Ava"
    className="h-8 w-8 rounded-full object-cover shadow"
  />
);

export default function BHCChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Welcome to BHC Global! I'm Ava, your AI Assistant. How can I help you today?",
    },
  ]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const quickReplies = useMemo(
    () => [
      'Services at BHC',
      'About BHC Global',
      'What is POWERCONNECT.AI',
    ],
    []
  );

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/bhc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.text ?? 'Okay.' }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry—something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-bhcBlue text-white shadow-bhc hover:shadow-lg transition-all grid place-items-center"
        >
          💬
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[92vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 bg-bhcBlue px-4 py-3 text-white">
            <AvaAvatar />
            <div className="flex-1">
              <div className="font-semibold leading-tight">Ava</div>
              <div className="text-xs/5 opacity-90">Online • typically replies instantly</div>
            </div>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 hover:bg-white/10"
            >
              ✖
            </button>
          </div>

          {/* Messages */}
          <div
            ref={viewportRef}
            className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-3 bg-slate-50"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <div className="mr-2 self-end"><AvaAvatar /></div>}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[15px] shadow-sm max-w-[80%] whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-bhcBlue text-white rounded-br-sm'
                      : 'bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <AvaAvatar />
                <span className="ml-1">Ava is typing…</span>
              </div>
            )}

            {/* Quick Replies */}
            {!loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-bhcBlue hover:text-bhcBlue transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white px-3 py-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about services, AMI, or careers…"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[15px] outline-none focus:ring-2 focus:ring-bhcBlue"
              />
              <button
                type="submit"
                disabled={loading || input.trim() === ''}
                className="rounded-xl bg-bhcBlue px-3.5 py-2 text-white font-medium shadow hover:bg-bhcBlue-light disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
