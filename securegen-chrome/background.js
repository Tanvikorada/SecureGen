const GROQ_SYSTEM_PROMPT = `You are a cybersecurity expert specializing in vulnerabilities in AI-generated code. Analyze the provided code and return ONLY a valid JSON object with this exact structure:
{
  "overall_risk": "critical|high|medium|low|safe",
  "risk_score": <number 0-100>,
  "summary": "<one sentence summary of overall security posture>",
  "vulnerabilities": [
    {
      "id": "V1",
      "type": "<vulnerability type>",
      "severity": "critical|high|medium|low",
      "line_reference": "<approximate line or function name>",
      "description": "<what is wrong>",
      "exploit_scenario": "<how an attacker exploits this, 2-3 sentences>",
      "cvss_score": <number 0-10>,
      "owasp_category": "<OWASP category if applicable>"
    }
  ],
  "secure_version": "<complete rewritten secure code>",
  "changes_made": ["<change 1>", "<change 2>"],
  "ai_generation_patterns": ["<why an AI typically makes this mistake>"]
}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ANALYZE_CODE') {
    handleAnalysis(request.code, request.language)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep message channel open for async response
  }
});

async function handleAnalysis(code, language) {
  const result = await chrome.storage.local.get(['provider', 'groqApiKey', 'geminiApiKey']);
  const provider = result.provider || 'groq';

  if (provider === 'gemini') {
    if (!result.geminiApiKey) throw new Error('Gemini API Key missing. Please click the SecureGen extension icon to configure your key.');
    return analyzeGemini(code, language, result.geminiApiKey);
  } else {
    if (!result.groqApiKey) throw new Error('Groq API Key missing. Please click the SecureGen extension icon to configure your key.');
    return analyzeGroq(code, language, result.groqApiKey);
  }
}

async function analyzeGroq(code, language, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: GROQ_SYSTEM_PROMPT },
        { role: 'user', content: `Language: ${language}\n\nCode to analyze:\n${code}` }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Groq API key. Please check your extension settings.');
    if (response.status === 429) throw new Error('Groq rate limit exceeded. Try again later.');
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content;
  return parseResponse(rawText);
}

async function analyzeGemini(code, language, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: GROQ_SYSTEM_PROMPT }]
      },
      contents: [{
        parts: [{ text: `Language: ${language}\n\nCode to analyze:\n${code}` }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 3000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 400 && errorText.includes('API key not valid')) throw new Error('Invalid Gemini API key.');
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return parseResponse(rawText);
}

function parseResponse(text) {
  let cleanedText = text.trim();
  cleanedText = cleanedText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
  
  try {
    return JSON.parse(cleanedText);
  } catch (err) {
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extractedJson = cleanedText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extractedJson);
      } catch (err2) {
        throw new Error('Failed to parse AI response. Try again.');
      }
    }
    throw new Error('Failed to parse AI response. Try again.');
  }
}
