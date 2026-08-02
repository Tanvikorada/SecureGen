import * as vscode from 'vscode';
import * as https from 'https';

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

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('securegen.auditSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a file and select some code to audit.');
            return;
        }

        const selection = editor.selection;
        const code = editor.document.getText(selection);
        const language = editor.document.languageId;

        if (!code.trim()) {
            vscode.window.showInformationMessage('Please highlight the code you want to audit.');
            return;
        }

        const config = vscode.workspace.getConfiguration('securegen');
        const provider = config.get<string>('provider') || 'Groq (Llama 3)';
        const groqApiKey = config.get<string>('groqApiKey');
        const geminiApiKey = config.get<string>('geminiApiKey');
        
        const apiKey = provider === 'Google Gemini' ? geminiApiKey : groqApiKey;

        if (!apiKey) {
            vscode.window.showErrorMessage(`SecureGen API Key missing for ${provider}. Please add it in VS Code Settings.`);
            return;
        }

        // Show Progress
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "SecureGen: Auditing Code...",
            cancellable: false
        }, async (progress) => {
            try {
                const result = await analyzeCode(code, language, apiKey, provider);
                showWebview(context, result);
            } catch (err: any) {
                vscode.window.showErrorMessage(`SecureGen Error: ${err.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

function analyzeCode(code: string, language: string, apiKey: string, provider: string): Promise<any> {
    if (provider === 'Google Gemini') {
        return analyzeCodeGemini(code, language, apiKey);
    }
    return analyzeCodeGroq(code, language, apiKey);
}

function analyzeCodeGroq(code: string, language: string, apiKey: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: GROQ_SYSTEM_PROMPT },
                { role: 'user', content: `Language: ${language}\n\nCode to analyze:\n${code}` }
            ],
            temperature: 0.1,
            max_tokens: 3000
        });

        const req = https.request({
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk.toString());
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    if (res.statusCode === 401) return reject(new Error('Invalid Groq API Key'));
                    if (res.statusCode === 429) return reject(new Error('Groq Rate Limit Exceeded'));
                    return reject(new Error(`Groq API Error: ${res.statusCode}`));
                }
                parseAIResponse(body, resolve, reject, 'groq');
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

function analyzeCodeGemini(code: string, language: string, apiKey: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
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
        });

        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk.toString());
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    if (res.statusCode === 400 && body.includes('API key not valid')) return reject(new Error('Invalid Gemini API Key'));
                    return reject(new Error(`Gemini API Error: ${res.statusCode}`));
                }
                parseAIResponse(body, resolve, reject, 'gemini');
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

function parseAIResponse(body: string, resolve: Function, reject: Function, provider: 'groq' | 'gemini') {
    try {
        const parsed = JSON.parse(body);
        let rawText = '';
        if (provider === 'groq') {
            rawText = parsed.choices[0].message.content;
        } else {
            rawText = parsed.candidates[0].content.parts[0].text;
        }
        
        let cleanedText = rawText.trim();
        cleanedText = cleanedText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
        
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            resolve(JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1)));
        } else {
            reject(new Error('Failed to parse AI response.'));
        }
    } catch (e) {
        reject(new Error('Failed to parse AI response.'));
    }
}

function showWebview(context: vscode.ExtensionContext, data: any) {
    const panel = vscode.window.createWebviewPanel(
        'secureGenReport',
        'SecureGen Audit Report',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const getSeverityClass = (sev: string) => {
        switch(sev?.toLowerCase()) {
          case 'critical': return 'critical';
          case 'high': return 'high';
          case 'medium': return 'medium';
          case 'low': return 'low';
          default: return 'low';
        }
    };

    let vulnsHtml = '';
    if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        vulnsHtml = data.vulnerabilities.map((v: any) => `
            <div class="vuln-card">
                <h4><span class="badge ${getSeverityClass(v.severity)}">${v.severity}</span> ${v.type}</h4>
                <p>${v.description}</p>
                ${v.exploit_scenario ? `
                    <div class="exploit">
                        <div class="exploit-title">Exploit Scenario</div>
                        ${v.exploit_scenario}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        vulnsHtml = `<p style="color: #10B981; font-weight: 600;">No vulnerabilities detected!</p>`;
    }

    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 20px; }
            h2 { margin-top: 0; display: flex; align-items: center; gap: 8px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
            .badge.critical { background-color: rgba(239, 68, 68, 0.2); color: #EF4444; border-color: rgba(239, 68, 68, 0.3); }
            .badge.high { background-color: rgba(249, 115, 22, 0.2); color: #F97316; border-color: rgba(249, 115, 22, 0.3); }
            .badge.medium { background-color: rgba(245, 158, 11, 0.2); color: #F59E0B; border-color: rgba(245, 158, 11, 0.3); }
            .badge.low { background-color: rgba(16, 185, 129, 0.2); color: #10B981; border-color: rgba(16, 185, 129, 0.3); }
            .vuln-card { background-color: var(--vscode-editor-inactiveSelectionBackground); border-radius: 6px; padding: 12px; margin-top: 16px; border: 1px solid var(--vscode-widget-border); }
            .vuln-card h4 { margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; font-size: 14px; }
            .vuln-card p { opacity: 0.9; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0; }
            .exploit { background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px; border-radius: 4px; font-size: 12px; }
            .exploit-title { color: #EF4444; font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; }
            .secure-code { background-color: var(--vscode-editor-background); padding: 12px; border-radius: 6px; overflow-x: auto; font-family: var(--vscode-editor-font-family); font-size: 12px; margin-top: 16px; border: 1px solid var(--vscode-widget-border); }
        </style>
    </head>
    <body>
        <h2>🛡️ SecureGen Audit</h2>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 20px;">Score: ${data.risk_score}/100</h3>
          <span class="badge ${getSeverityClass(data.overall_risk)}">${data.overall_risk}</span>
        </div>
        <p style="opacity: 0.8; margin-top: 0;">${data.summary}</p>
        
        <h3 style="margin-top: 24px; margin-bottom: 8px;">Vulnerabilities</h3>
        ${vulnsHtml}

        ${data.secure_version ? `
          <h3 style="margin-top: 24px; margin-bottom: 8px;">Secure Alternative</h3>
          <div class="secure-code"><pre style="margin:0;"><code>${data.secure_version.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>
        ` : ''}
    </body>
    </html>`;
}

export function deactivate() {}
