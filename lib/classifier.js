import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

function normalizeText(txt) {
  if (!txt) return '';
  return txt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAmount(msg) {
  const m = msg.match(/\b\d+(?:\s*(?:taka|bdt|tk|টাকা))?\b/i);
  if (m) {
    const n = m[0].replace(/[^\d]/g, '');
    if (n) return `${n} BDT`;
  }
  return null;
}

function classifyLocally(message, locale, channel) {
  const norm = normalizeText(message);
  const keywords = {
    phishing_or_social_engineering: [
      'otp', 'pin', 'password', 'scam', 'scammer', 'fraud', 'fake', 'credential',
      'suspicious call', 'agent call', 'bkash agent', 'share pin', 'share otp',
      'pass code', 'card number', 'cvv', 'lottery', 'prize', 'winner',
      'পিন', 'ওটিপি', 'পাসওয়ার্ড', 'প্রতারণা', 'ভুয়া', 'ভুয়া', 'লটারি', 'পুরস্কার',
      'এজেন্ট', 'প্রতারক', 'কার্ড নাম্বার', 'পাসওয়ার্ড'
    ],
    wrong_transfer: [
      'wrong number', 'wrong account', 'wrong send', 'sent to wrong', 'wrong digit',
      'mistake send', 'another number', 'another account', 'accidentally sent',
      'money sent to wrong', 'wrong transfer', 'sent money to wrong',
      'ভুল নম্বর', 'ভুল নাম্বার', 'ভুল করে', 'ভুল একাউন্ট', 'অন্য নাম্বারে',
      'ভুল সেন্ড', 'ভুল পাঠাইছি', 'ভুল নম্বরে টাকা', 'ভুল নাম্বারে টাকা', 'ভুল নাম্বারে'
    ],
    payment_failed: [
      'failed', 'deducted', 'declined', 'error', 'unsuccessful', 'taka cut',
      'money cut', 'balance cut', 'pending', 'timed out', 'timeout', 'not completed',
      'charge failed', 'payment failed', 'failed transaction', 'money deducted',
      'ব্যালেন্স কেটেছে', 'টাকা কেটেছে', 'ফেইল', 'ব্যর্থ', 'টাকা কেটে নিয়েছে',
      'কেটে গেল', 'পেমেন্ট ফেইল', 'পেমেন্ট ব্যর্থ', 'টাকা কেটেছে কিন্তু'
    ],
    refund_request: [
      'refund', 'return money', 'get back my money', 'want my money back',
      'cancel transaction', 'refund please', 'money return', 'reimburse',
      'টাকা ফেরত', 'রিফান্ড', 'টাকা ব্যাক', 'ফেরত চাই', 'টাকা ফেরত দিন', 'ফেরত দিন'
    ]
  };

  let scores = { phishing_or_social_engineering: 0, wrong_transfer: 0, payment_failed: 0, refund_request: 0 };

  for (const [cat, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (norm.includes(w)) {
        scores[cat] += 1;
        if (w.includes(' ') && norm.includes(w)) {
          scores[cat] += 1;
        }
      }
    }
  }

  let bestCat = 'other';
  let max = 0;
  for (const [c, s] of Object.entries(scores)) {
    if (s > max) {
      max = s;
      bestCat = c;
    }
  }

  let sev = 'low';
  if (bestCat === 'phishing_or_social_engineering') {
    sev = 'critical';
  } else if (bestCat === 'wrong_transfer' || bestCat === 'payment_failed') {
    sev = 'high';
  } else if (bestCat === 'refund_request') {
    const contested = norm.includes('dispute') || norm.includes('unauthorized') || norm.includes('scam') || norm.includes('force');
    sev = contested ? 'high' : 'low';
  } else {
    sev = norm.includes('urgent') || norm.includes('emergency') || norm.includes('security') ? 'medium' : 'low';
  }

  let dept = 'customer_support';
  if (bestCat === 'phishing_or_social_engineering') {
    dept = 'fraud_risk';
  } else if (bestCat === 'wrong_transfer') {
    dept = 'dispute_resolution';
  } else if (bestCat === 'payment_failed') {
    dept = 'payments_ops';
  } else if (bestCat === 'refund_request') {
    dept = sev === 'high' ? 'dispute_resolution' : 'customer_support';
  }

  let summary = 'Customer reports an issue with their account.';
  const amt = extractAmount(message);

  if (bestCat === 'wrong_transfer') {
    summary = amt ? `Customer reports sending ${amt} to a wrong number and requests assistance.` : 'Customer reports sending money to a wrong number and requests recovery.';
  } else if (bestCat === 'payment_failed') {
    summary = amt ? `Customer reports a failed transaction of ${amt} where the balance was deducted.` : 'Customer reports a failed transaction where the balance was deducted.';
  } else if (bestCat === 'refund_request') {
    summary = 'Customer requests a refund for their recent transaction.';
  } else if (bestCat === 'phishing_or_social_engineering') {
    summary = 'Customer reports a suspicious call or message requesting their security credentials.';
  } else {
    if (message.length < 80) {
      summary = `Customer reports: "${message.replace(/[.!?]+$/, '')}".`;
    } else {
      summary = 'Customer reports an application issue requiring technical support.';
    }
  }

  const review = (sev === 'critical' || bestCat === 'phishing_or_social_engineering');
  const conf = max > 0 ? 0.85 : 0.60;

  return {
    case_type: bestCat,
    severity: sev,
    department: dept,
    agent_summary: summary,
    human_review_required: review,
    confidence: conf
  };
}
async function callGroq(message, locale, channel, key, sig) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    signal: sig,
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are an expert customer ticket classifier for a digital finance company. Analyze the ticket and return a JSON object matching this schema:
{
  "case_type": "wrong_transfer" | "payment_failed" | "refund_request" | "phishing_or_social_engineering" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "department": "customer_support" | "dispute_resolution" | "payments_ops" | "fraud_risk",
  "agent_summary": "string",
  "human_review_required": boolean,
  "confidence": number
}
Rules:
- case_type: wrong_transfer, payment_failed, refund_request, phishing_or_social_engineering, other
- department: customer_support (for other/low-refund), dispute_resolution (wrong_transfer/high-refund), payments_ops (payment_failed), fraud_risk (phishing)
- severity: critical (phishing), high (wrong_transfer/failed-payment-with-deduction), low (app crash, low-refund)
- Safety: agent_summary must be 1-2 neutral sentences. NEVER ask the customer to share PIN, OTP, password, or card number. Just summarize.
- Output ONLY JSON.`
        },
        {
          role: 'user',
          content: `Message: "${message}"\nLocale: "${locale}"\nChannel: "${channel}"`
        }
      ]
    })
  });

  if (!r.ok) throw new Error(`Groq status ${r.status}`);
  const d = await r.json();
  const c = d.choices?.[0]?.message?.content;
  if (!c) throw new Error('No content from Groq');
  return JSON.parse(c);
}
async function callGemini(message, locale, channel, key, sig) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: sig,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Message: "${message}"\nLocale: "${locale}"\nChannel: "${channel}"` }] }],
      systemInstruction: {
        parts: [{
          text: `You are an expert customer ticket classifier. Return JSON:
{
  "case_type": "wrong_transfer" | "payment_failed" | "refund_request" | "phishing_or_social_engineering" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "department": "customer_support" | "dispute_resolution" | "payments_ops" | "fraud_risk",
  "agent_summary": "string",
  "human_review_required": boolean,
  "confidence": number
}
Rules:
- case_type: wrong_transfer, payment_failed, refund_request, phishing_or_social_engineering, other
- department: customer_support (for other/low-refund), dispute_resolution (wrong_transfer/high-refund), payments_ops (payment_failed), fraud_risk (phishing)
- severity: critical (phishing), high (wrong_transfer/failed-payment-with-deduction), low (app crash, low-refund)
- Safety: agent_summary must be 1-2 neutral sentences. NEVER ask the customer to share PIN, OTP, password, or card number.`
        }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            case_type: { type: 'string', enum: ['wrong_transfer', 'payment_failed', 'refund_request', 'phishing_or_social_engineering', 'other'] },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            department: { type: 'string', enum: ['customer_support', 'dispute_resolution', 'payments_ops', 'fraud_risk'] },
            agent_summary: { type: 'string' },
            human_review_required: { type: 'boolean' },
            confidence: { type: 'number' }
          },
          required: ['case_type', 'severity', 'department', 'agent_summary', 'human_review_required', 'confidence']
        }
      }
    })
  });

  if (!r.ok) throw new Error(`Gemini status ${r.status}`);
  const d = await r.json();
  const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('No content from Gemini');
  return JSON.parse(txt);
}
export async function classifyTicket(ticket) {
  const { ticket_id, message, locale = 'en', channel = 'app' } = ticket;
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;

  if (!message) throw new Error('Message field is required');

  const sensitive = ['never share', 'do not give', 'please don\'t share', 'keep your pin', 'don\'t share your otp'];
  const isSafe = (summary) => {
    if (!summary) return false;
    const low = summary.toLowerCase();
    for (const k of sensitive) {
      if (low.includes(k)) return false;
    }
    if (low.includes('pin') && (low.includes('enter') || low.includes('share') || low.includes('give'))) return false;
    if (low.includes('otp') && (low.includes('enter') || low.includes('share') || low.includes('give'))) return false;
    return true;
  };

  if (groq) {
    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await callGroq(message, locale, channel, groq, ctrl.signal);
      res.confidence = Math.max(0.5, typeof res.confidence === 'number' ? res.confidence : 0.6);
      if (res.confidence > 1) res.confidence = 1.0;
      
      if (res.case_type === 'phishing_or_social_engineering') {
        res.severity = 'critical';
      }
      res.human_review_required = (res.severity === 'critical' || res.case_type === 'phishing_or_social_engineering');

      if (isSafe(res.agent_summary)) {
        return { ticket_id, ...res };
      }
    } catch (e) {
      console.warn('Groq failed, trying next:', e.message);
    } finally {
      clearTimeout(tId);
    }
  }

  if (gemini) {
    const ctrl = new AbortController();
    const tId = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await callGemini(message, locale, channel, gemini, ctrl.signal);
      res.confidence = Math.max(0.5, typeof res.confidence === 'number' ? res.confidence : 0.6);
      if (res.confidence > 1) res.confidence = 1.0;
      
      if (res.case_type === 'phishing_or_social_engineering') {
        res.severity = 'critical';
      }
      res.human_review_required = (res.severity === 'critical' || res.case_type === 'phishing_or_social_engineering');

      if (isSafe(res.agent_summary)) {
        return { ticket_id, ...res };
      }
    } catch (e) {
      console.warn('Gemini failed, trying fallback:', e.message);
    } finally {
      clearTimeout(tId);
    }
  }

  const local = classifyLocally(message, locale, channel);
  return { ticket_id, ...local };
}
