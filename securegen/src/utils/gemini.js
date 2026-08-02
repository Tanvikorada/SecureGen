export async function analyzeCode(code, language, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are a cybersecurity expert specializing in vulnerabilities in code. Analyze the provided code and return ONLY a valid JSON object with this exact structure:
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
  "secure_version": "<complete rewritten secure version of the code>",
  "changes_made": ["<change 1 and why>", "<change 2 and why>"],
  "ai_generation_patterns": ["<why developers or AI tools commonly make this mistake>"]
}
Return ONLY valid JSON. No markdown. No explanation outside JSON.`;

  const userMessage = `Language: ${language}\n\nCode to analyze:\n${code}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for Gemini

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 400) {
        throw { message: 'Invalid request.', fix: 'Ensure you are using a valid Gemini API key.' };
      } else if (response.status === 403) {
        throw { message: 'Invalid API key or unauthorized.', fix: 'Check your API key at aistudio.google.com' };
      } else if (response.status === 429) {
        throw { message: 'Rate limit exceeded.', fix: 'Wait a moment before trying again.' };
      } else {
        throw { message: `API request failed with status: ${response.status}`, fix: 'Check your network connection and try again.' };
      }
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseAnalysisResponse(rawText);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw { message: 'Request timed out after 60 seconds.', fix: 'The API took too long to respond. Please try again.' };
    }
    if (error.fix) throw error;
    throw { message: error.message || 'Network failure.', fix: 'Check your internet connection and try again.' };
  }
}

function parseAnalysisResponse(text) {
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
        throw { message: 'Failed to parse security analysis.', fix: 'The AI model returned invalid data. Please try again.' };
      }
    }
    throw { message: 'Failed to parse security analysis.', fix: 'The AI model returned invalid data. Please try again.' };
  }
}