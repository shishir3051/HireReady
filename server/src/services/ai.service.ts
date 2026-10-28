import { env, geminiEnabled } from '../config/env';
import { badRequest, serviceUnavailable } from '../lib/errors';

export interface AiEvaluationInput {
  questionTitle: string;
  questionPrompt: string;
  questionKind?: string;
  modelAnswer?: string;
  userNotes: string;
  lang?: 'en' | 'bn';
}

export interface AiEvaluationResult {
  rating: number; // 1 to 5
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';
  summary: string;
  strengths: string[];
  improvements: string[];
  missingEdgeCases: string[];
}

export interface AiChatInput {
  questionTitle: string;
  questionPrompt: string;
  modelAnswer?: string;
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  lang?: 'en' | 'bn';
}

export interface AiChatResult {
  reply: string;
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(
  payload: Record<string, unknown>,
  timeoutMs = 25000,
): Promise<any> {
  if (!geminiEnabled || !env.GEMINI_API_KEY) {
    throw serviceUnavailable('Gemini AI is not configured on this server');
  }

  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let errMsg = `Gemini API error (${res.status})`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed.error?.message ?? errMsg;
      } catch {
        // use fallback
      }
      throw serviceUnavailable(`AI service error: ${errMsg}`);
    }

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw serviceUnavailable('AI service request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Evaluates candidate notes / draft code against the question requirements. */
export async function evaluateMockAnswer(input: AiEvaluationInput): Promise<AiEvaluationResult> {
  const { questionTitle, questionPrompt, questionKind = 'coding', modelAnswer = '', userNotes, lang = 'en' } = input;

  if (!userNotes || userNotes.trim().length < 5) {
    throw badRequest('Please provide your notes or draft solution before requesting an evaluation.');
  }

  const isBn = lang === 'bn';
  const systemInstruction = isBn
    ? `আপনি একজন সিনিয়র সফটওয়্যার ইঞ্জিনিয়ারিং ইন্টারভিউয়ার। প্রার্থী মক ইন্টারভিউ চলাকালীন এই প্রশ্নের জন্য খসড়া নোট বা কোড লিখেছেন।
আপনার কাজ হল প্রার্থীর খসড়া সমাধান নিরপেক্ষভাবে মূল্যায়ন করা এবং গঠনমূলক প্রতিক্রিয়া দেওয়া।
রেটিং স্কেল ১ থেকে ৫:
1: No Hire (অপ্রাসঙ্গিক বা ভুল ধারণা)
2: Lean No Hire (অসম্পূর্ণ, বড় অ্যালগরিদমিক ভুল বা মূল এজ কেস বাদ)
3: Lean Hire (কাজের উপযুক্ত কিন্তু অপ্টিমাইজেশন বা কোড স্ট্রাকচারে উন্নতি দরকার)
4: Hire (কার্যকর, সঠিক কমপ্লেক্সিটি এবং এজ কেস হ্যান্ডলিং)
5: Strong Hire (চমৎকার সমাধান, আদর্শ টাইম/স্পেস কমপ্লেক্সিটি, পরিষ্কার স্ট্রাকচার)

বাঙালি শিক্ষার্থীদের সুবিধার জন্য বাংলা ভাষায় প্রতিক্রিয়া লিখুন (প্রযুক্তিগত পরিভাষাগুলো যেমন Time Complexity, Edge Case ইংরেজিতে রাখতে পারেন)।
আপনাকে অবশ্যই একটি বৈধ JSON অবজেক্ট রিটার্ন করতে হবে নিম্নরূপ:
{
  "rating": number (1-5),
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "summary": "১-২ বাক্যে সংক্ষেপ মূল্যায়ন",
  "strengths": ["কী ভালো হয়েছে ১", "কী ভালো হয়েছে ২"],
  "improvements": ["উন্নতির জায়গা ১", "উন্নতির জায়গা ২"],
  "missingEdgeCases": ["মিসিং এজ কেস বা সতর্কতা"]
}`
    : `You are a staff software engineer and rigorous technical interviewer evaluating a junior candidate's draft notes and solution during a mock interview.
Evaluate the candidate's notes and solution against the question requirements.
Rating scale (1 to 5):
1: No Hire (irrelevant or fundamentally flawed)
2: Lean No Hire (incomplete, major algorithmic issues, or critical edge cases overlooked)
3: Lean Hire (working direction, acceptable, but needs optimization or cleaner structure)
4: Hire (solid solution, correct time/space complexity, good edge case consideration)
5: Strong Hire (exceptional clarity, optimal complexity, thorough edge case handling)

Return a strictly valid JSON object matching this schema:
{
  "rating": number (1-5),
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "summary": "1-2 sentence high-level evaluation",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "improvements": ["Actionable improvement 1", "Actionable improvement 2"],
  "missingEdgeCases": ["Specific edge cases or constraints to verify"]
}`;

  const userPrompt = `### Question:
${questionTitle} (${questionKind})

### Problem Statement:
${questionPrompt.slice(0, 3000)}

${modelAnswer ? `### Reference Solution Summary:\n${modelAnswer.slice(0, 2000)}\n` : ''}

### Candidate's Scratch Notes / Answer:
${userNotes.slice(0, 4000)}

Provide your evaluation JSON now.`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      maxOutputTokens: 1500,
    },
  };

  const data = await callGemini(payload);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw serviceUnavailable('Gemini returned an empty evaluation');

  try {
    const parsed = JSON.parse(text);
    return {
      rating: Math.max(1, Math.min(5, Number(parsed.rating) || 3)),
      verdict: parsed.verdict || 'Lean Hire',
      summary: parsed.summary || 'Solution reviewed.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4) : [],
      missingEdgeCases: Array.isArray(parsed.missingEdgeCases) ? parsed.missingEdgeCases.slice(0, 4) : [],
    };
  } catch (e) {
    throw serviceUnavailable('Failed to parse AI evaluation response');
  }
}

/** Socratic AI Tutor for a specific interview question. */
export async function askQuestionTutor(input: AiChatInput): Promise<AiChatResult> {
  const { questionTitle, questionPrompt, modelAnswer = '', message, history = [], lang = 'en' } = input;

  if (!message || message.trim().length === 0) {
    throw badRequest('Please provide a question or message for the tutor.');
  }

  const isBn = lang === 'bn';
  const systemInstruction = isBn
    ? `আপনি HireReady-এর একজন সহযোগী AI টিউটর। আপনি নতুন ও জুনিয়র সফটওয়্যার ইঞ্জিনিয়ারদের ইন্টারভিউ প্রস্তুতিতে সাহায্য করেন।
আপনার ব্যক্তিত্ব: বন্ধুত্বপূর্ণ, উৎসাহব্যঞ্জক এবং স্পষ্ট।
নিয়মাবলি:
1. শিক্ষার্থী প্রশ্ন বা হিন্ট চাইলে সরাসরি সম্পূর্ণ কোড লিখে দেওয়ার বদলে চিন্তার দিক নির্দেশনা (Socratic method) দিন, যাতে সে নিজে সমাধান করতে পারে। তবে সে যদি কোড বা কনসেপ্ট ব্যাখ্যা করতে বলে, তবে স্পষ্ট ও প্রাঞ্জলভাবে বুঝিয়ে দিন।
2. কোড বা ফর্মুলা থাকলে সুন্দর Markdown কোড ব্লকে দিন।
3. বাংলা ভাষায় উত্তর দিন। তবে টেকনিক্যাল টার্ম (যেমন: Big-O, Hash Map, Two Pointers) যথাযথভাবে ইংরেজিতে রাখুন।
4. উত্তর খুব বেশি দীর্ঘ না করে টু-দ্য-পয়েন্ট ও আকর্ষণীয় রাখুন।`
    : `You are an encouraging and expert AI Technical Tutor on HireReady, helping junior software engineers prepare for tech interviews.
Guidelines:
1. Use the Socratic method: when asked for hints, guide the student with progressive intuition rather than dumping the full code solution immediately, unless they explicitly ask for an explanation of the solution.
2. If the user asks about time/space complexity, edge cases, or concept clarity, provide concise, crystal-clear explanations.
3. Format code snippets with clean Markdown syntax.
4. Keep explanations structured, punchy, and engaging.`;

  const contextPrompt = `Context Question:
Title: ${questionTitle}
Prompt: ${questionPrompt.slice(0, 2500)}
${modelAnswer ? `Reference Answer: ${modelAnswer.slice(0, 1500)}` : ''}`;

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
    {
      role: 'user',
      parts: [{ text: `[System Context for this study session]\n${contextPrompt}` }],
    },
    {
      role: 'model',
      parts: [
        {
          text: isBn
            ? `আমি প্রস্তুত! "${questionTitle}" প্রশ্নটি সম্পর্কে আপনার যেকোনো প্রশ্ন, হিন্ট বা বোঝার জন্য আমি সাহায্য করতে পারি।`
            : `I'm ready! Ask me anything about "${questionTitle}" — whether you want a hint, help understanding the approach, or an analysis of your code.`,
        },
      ],
    },
  ];

  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role,
      parts: [{ text: h.text }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1200,
    },
  };

  const data = await callGemini(payload);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw serviceUnavailable('Gemini did not generate a reply');

  return { reply: text };
}
