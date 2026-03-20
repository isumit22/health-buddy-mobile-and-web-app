
import { useMemo, useState, type FormEvent } from 'react';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
};

function nowISO() {
  return new Date().toISOString();
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi, I am Health Buddy. Tell me how you are feeling today, and I will support you with calm, practical guidance.",
      createdAt: nowISO(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [mood, setMood] = useState('neutral');
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');
  const [moodStatus, setMoodStatus] = useState('');

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) {
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      createdAt: nowISO(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data?.message || 'I could not generate a response right now.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantContent,
          createdAt: nowISO(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I hit a temporary issue reaching the AI service. Please try again in a moment.',
          createdAt: nowISO(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMoodSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMoodStatus('Saving mood...');
    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, intensity, notes }),
      });

      if (!response.ok) {
        throw new Error(`Mood API failed with status ${response.status}`);
      }

      setMoodStatus('Mood saved. Great job checking in with yourself.');
      setNotes('');
    } catch (error) {
      setMoodStatus('Mood could not be saved. Make sure DATABASE_URL is configured on the server.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 p-5">
            <h1 className="text-2xl font-semibold tracking-tight">Health Buddy Web</h1>
            <p className="mt-1 text-sm text-slate-600">
              A compassionate AI companion for mental wellness check-ins.
            </p>
          </header>

          <div className="h-[58vh] space-y-3 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <article
                key={`${message.createdAt}-${index}`}
                className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p>{message.content}</p>
              </article>
            ))}
            {loading ? (
              <article className="max-w-[90%] rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                Health Buddy is thinking...
              </article>
            ) : null}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type how you feel..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Mood Check-In</h2>
            <p className="mt-1 text-sm text-slate-600">
              Track your emotional state to build awareness over time.
            </p>

            <form onSubmit={handleMoodSubmit} className="mt-4 space-y-3">
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="happy">Happy</option>
                <option value="calm">Calm</option>
                <option value="neutral">Neutral</option>
                <option value="stressed">Stressed</option>
                <option value="anxious">Anxious</option>
                <option value="sad">Sad</option>
                <option value="angry">Angry</option>
              </select>

              <label className="block text-sm text-slate-700">
                Intensity: <strong>{intensity}</strong>/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full"
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Save Mood
              </button>
            </form>

            {moodStatus ? <p className="mt-3 text-sm text-slate-600">{moodStatus}</p> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Deploy Notes</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Set env vars on Vercel for AI and auth endpoints.</li>
              <li>Set DATABASE_URL to enable mood and conversation storage.</li>
              <li>Without DB, chat still works but history endpoints can fail.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
