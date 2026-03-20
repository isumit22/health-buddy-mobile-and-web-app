
import { useMemo, useRef, useState, type FormEvent } from 'react';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type ConcernProfile = {
  key: string;
  title: string;
  mood: string;
  keywords: string[];
  solutions: string[];
  motivations: string[];
};

const concernProfiles: ConcernProfile[] = [
  {
    key: 'headache',
    title: 'Headache Stress Response',
    mood: 'stressed',
    keywords: ['headache', 'head pain', 'migraine', 'heavy head', 'my head hurts'],
    solutions: [
      'Drink water slowly and avoid screens for 10-15 minutes.',
      'Try a 4-7-8 breathing cycle for 3 rounds.',
      'Dim lights and reduce noise where possible.',
      'If severe or frequent, seek medical advice promptly.',
    ],
    motivations: [
      'You are handling this one step at a time, and that is strength.',
      'Rest is productive when your body asks for it.',
      'Small recovery steps now can create big relief soon.',
      'You are listening to your body, and that is wise.',
      'Pain is temporary; your resilience is not.',
      'You are doing better than you think right now.',
    ],
  },
  {
    key: 'mood-off',
    title: 'Low Mood Pattern',
    mood: 'sad',
    keywords: ['mood off', 'low mood', 'not feeling good', 'feeling low', 'down today'],
    solutions: [
      'Name one emotion in one word to reduce mental overload.',
      'Take a 10-minute walk or stretch break to reset energy.',
      'Do one tiny win task to regain momentum.',
      'Reach out to one trusted person with a simple message.',
    ],
    motivations: [
      'A low day does not define your whole story.',
      'You are still moving forward, even in small steps.',
      'Your effort today matters more than perfection.',
      'You have survived hard days before and can do it again.',
      'Your feelings are valid, and they will shift with time.',
      'You are not behind; you are healing at your pace.',
    ],
  },
  {
    key: 'alone',
    title: 'Loneliness Pattern',
    mood: 'lonely',
    keywords: ['feeling alone', 'i am alone', 'lonely', 'no one understands', 'isolated'],
    solutions: [
      'Send one short message to a friend or family member.',
      'Join a public space for 15 minutes: park, cafe, or community room.',
      'Use voice notes instead of text if typing feels heavy.',
      'Build a tiny routine anchor: tea, journal, and 5 deep breaths.',
    ],
    motivations: [
      'You are not invisible. Your presence matters deeply.',
      'Connection can start with one small hello.',
      'You deserve support exactly as you are today.',
      'Being alone right now does not mean being unloved.',
      'Your voice has value and people care more than you think.',
      'One small reach-out can change the tone of your day.',
    ],
  },
  {
    key: 'depressed',
    title: 'Depressive Thought Pattern',
    mood: 'depressed',
    keywords: ['feeling depressed', 'depressed', 'hopeless', 'empty', 'nothing matters'],
    solutions: [
      'Break your next hour into three tiny actions only.',
      'Eat something light and hydrate to stabilize energy.',
      'Reduce pressure: focus on progress, not performance.',
      'Consider talking to a counselor or trusted mental health professional.',
    ],
    motivations: [
      'This moment is heavy, but you are not powerless.',
      'You are worthy of care, support, and recovery.',
      'Healing is not linear, and setbacks are not failure.',
      'You are brave for sharing what you feel.',
      'Even 1 percent better is still better, and it counts.',
      'Hold on to today; brighter days can return.',
    ],
  },
  {
    key: 'anxious',
    title: 'Anxiety Pattern',
    mood: 'anxious',
    keywords: ['anxious', 'anxiety', 'panic', 'overthinking', 'restless', 'worry'],
    solutions: [
      'Try box breathing: inhale 4, hold 4, exhale 4, hold 4.',
      'Write down the top 3 worries and one action for each.',
      'Limit caffeine and drink water for the next hour.',
      'Ground yourself using 5-4-3-2-1 sensory awareness.',
    ],
    motivations: [
      'You are safe in this moment, one breath at a time.',
      'Anxiety is loud, but your calm can be stronger.',
      'You can slow this down, and you are doing it now.',
      'Your mind is protecting you, and you can guide it gently.',
      'You are learning control through practice, not pressure.',
      'You are stronger than the thought spiral.',
    ],
  },
];

function detectConcernProfile(text: string): ConcernProfile | null {
  const normalized = text.toLowerCase();
  for (const profile of concernProfiles) {
    if (profile.keywords.some((keyword) => normalized.includes(keyword))) {
      return profile;
    }
  }
  return null;
}

function buildLocalSupportReply(userText: string): string {
  const profile = detectConcernProfile(userText);
  if (!profile) {
    return [
      'I am here with you. Let us take this one step at a time.',
      'Quick reset prompt:',
      '1) What are you feeling right now in one sentence?',
      '2) What is one small thing you can do in the next 10 minutes?',
      '3) Who is one person you can message for support today?',
    ].join('\n');
  }

  const topSolutions = profile.solutions.slice(0, 2).map((item, index) => `${index + 1}. ${item}`);
  const topMotivations = profile.motivations.slice(0, 2).map((item, index) => `${index + 1}. ${item}`);

  return [
    `I can hear this is difficult. Based on your message, I am detecting: ${profile.title}.`,
    'Try this right now:',
    ...topSolutions,
    'Motivation boost:',
    ...topMotivations,
    'If this feels intense or keeps getting worse, please consider reaching out to a trusted person or a mental health professional.',
  ].join('\n');
}

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
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const latestUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  }, [messages]);

  const analysisSourceText = input.trim() || latestUserText;
  const activeProfile = useMemo(
    () => detectConcernProfile(analysisSourceText),
    [analysisSourceText]
  );

  const matchedKeywords = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    const normalized = analysisSourceText.toLowerCase();
    return activeProfile.keywords.filter((keyword) => normalized.includes(keyword));
  }, [activeProfile, analysisSourceText]);

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
      const localSupport = buildLocalSupportReply(userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: localSupport,
          createdAt: nowISO(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const speech = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null;
  }

  function toggleVoiceInput() {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceStatus('Voice input stopped.');
      return;
    }

    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor) {
      setVoiceStatus('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript.trimStart());
      setVoiceStatus('Listening...');
    };

    recognition.onerror = (event) => {
      setVoiceStatus(`Voice error${event.error ? `: ${event.error}` : ''}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus((prev) => (prev === 'Listening...' ? 'Voice input captured.' : prev));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceStatus('Listening...');
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.65fr_1fr] lg:py-8">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 p-5">
            <h1 className="text-2xl font-semibold tracking-tight">Health Buddy Web</h1>
            <p className="mt-1 text-sm text-slate-600">
              A compassionate AI companion for mental wellness check-ins.
            </p>
          </header>

          <div className="h-[58vh] space-y-3 overflow-y-auto bg-slate-50/50 p-5">
            {messages.map((message, index) => (
              <article
                key={`${message.createdAt}-${index}`}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                <p className={message.role === 'assistant' ? 'whitespace-pre-line' : ''}>{message.content}</p>
              </article>
            ))}
            {loading ? (
              <article className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                Health Buddy is thinking...
              </article>
            ) : null}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type how you feel..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Send
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`rounded-xl px-5 py-3 text-sm font-medium text-white ${
                  isListening ? 'bg-rose-500' : 'bg-slate-700'
                }`}
              >
                {isListening ? 'Stop' : 'Voice'}
              </button>
            </div>
            {voiceStatus ? <p className="mt-2 text-xs text-slate-500">{voiceStatus}</p> : null}
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Automatic Wellness Insight</h2>
            <p className="mt-1 text-sm text-slate-600">
              Demo mode: your typed or voice text is scanned for emotional keywords.
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Detected Mood</p>
                <p className="mt-1 text-lg font-semibold capitalize text-slate-800">
                  {activeProfile ? activeProfile.mood : 'neutral'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Matched Keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {matchedKeywords.length > 0 ? (
                    matchedKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No critical keyword detected yet.</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Suggested Support Plan</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {(activeProfile?.solutions ?? [
                    'Share what is bothering you in one clear sentence.',
                    'Take 5 deep breaths and release shoulder tension.',
                    'Focus only on the next small helpful action.',
                    'If distress continues, reach out to someone you trust.',
                  ]).map((step, index) => (
                    <li key={step} className="rounded-lg border border-slate-200 p-2">
                      <span className="font-medium text-slate-500">{index + 1}. </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Motivation Boost</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {(activeProfile?.motivations ?? [
                    'You are making progress by speaking up.',
                    'You can handle this one step at a time.',
                    'Your feelings are valid and temporary.',
                    'You are not alone in this.',
                    'Small wins still count as wins.',
                    'You have more strength than this moment suggests.',
                  ]).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </aside>
      </div>
    </main>
  );
}
