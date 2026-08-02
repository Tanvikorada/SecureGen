export async function analyzeCode(code, language, apiKey) {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  
  const systemPrompt = `You are a cybersecurity expert specializing in vulnerabilities in AI-generated code. Analyze the provided code and return ONLY a valid JSON object with this exact structure:
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
  "ai_generation_patterns": ["<why AI tools commonly generate this>"]
}
Return ONLY valid JSON. No markdown. No explanation outside JSON.`;

  const userMessage = `Language: ${language}\n\nCode to analyze:\n${code}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 3000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw { message: 'Invalid API key.', fix: 'Check your API key at console.groq.com' };
      } else if (response.status === 429) {
        throw { message: 'Rate limit exceeded.', fix: 'Wait a moment before trying again or upgrade your Groq tier.' };
      } else {
        throw { message: `API request failed with status: ${response.status}`, fix: 'Check your network connection and try again.' };
      }
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;

    return parseAnalysisResponse(rawText);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw { message: 'Request timed out after 30 seconds.', fix: 'The API took too long to respond. Please try again.' };
    }
    // If it's already our structured error, just throw it
    if (error.fix) throw error;
    
    // Otherwise it's a generic network error
    throw { message: error.message || 'Network failure.', fix: 'Check your internet connection and try again.' };
  }
}

function parseAnalysisResponse(text) {
  let cleanedText = text.trim();
  
  // 1. Strip markdown code fences if they exist
  cleanedText = cleanedText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
  
  try {
    // Attempt 1: Direct parse
    return JSON.parse(cleanedText);
  } catch (err) {
    // 2. If it fails, try stripping leading/trailing non-JSON text
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extractedJson = cleanedText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extractedJson);
      } catch (err2) {
        // 3. If it still fails, throw clear error
        throw { message: 'Failed to parse security analysis.', fix: 'The AI model returned invalid data. Please try again.' };
      }
    }
    
    throw { message: 'Failed to parse security analysis.', fix: 'The AI model returned invalid data. Please try again.' };
  }
}