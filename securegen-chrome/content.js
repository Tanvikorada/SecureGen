// SVG Shield Icon
const shieldIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

// Inject buttons on page load and continuously watch for new code blocks
function injectButtons() {
  const preTags = document.querySelectorAll('pre');
  
  preTags.forEach(pre => {
    // Avoid double injection
    if (pre.querySelector('.securegen-scan-btn')) return;
    
    // Ensure parent is relatively positioned so absolute button places correctly
    pre.style.position = 'relative';

    const btn = document.createElement('button');
    btn.className = 'securegen-scan-btn';
    btn.innerHTML = `${shieldIcon} Audit`;
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleScan(pre, btn);
    });

    pre.appendChild(btn);
  });
}

// Watch DOM for dynamically loaded chat messages
const observer = new MutationObserver((mutations) => {
  injectButtons();
});
observer.observe(document.body, { childList: true, subtree: true });
// Initial run
injectButtons();

async function handleScan(preNode, btnNode) {
  // Extract code from the inner <code> tag
  const codeNode = preNode.querySelector('code');
  if (!codeNode) return;
  
  const code = codeNode.innerText;
  
  // Try to determine language from class (e.g. language-javascript)
  let language = 'javascript';
  const classMatch = codeNode.className.match(/language-(\w+)/);
  if (classMatch) {
    language = classMatch[1];
  }

  // Set loading state
  const originalHtml = btnNode.innerHTML;
  btnNode.innerHTML = 'Scanning...';
  btnNode.classList.add('loading');
  btnNode.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ANALYZE_CODE',
      code: code,
      language: language
    });

    if (response.success) {
      showModal(response.data);
    } else {
      alert(`SecureGen Error: ${response.error}`);
    }
  } catch (err) {
    alert(`SecureGen Error: Failed to communicate with background script.`);
  } finally {
    btnNode.innerHTML = originalHtml;
    btnNode.classList.remove('loading');
    btnNode.disabled = false;
  }
}

function showModal(data) {
  const existingModal = document.querySelector('.securegen-modal-overlay');
  if (existingModal) existingModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'securegen-modal-overlay';
  
  // Close on background click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const getSeverityClass = (sev) => {
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
    vulnsHtml = data.vulnerabilities.map(v => `
      <div class="securegen-vuln-card">
        <h4><span class="securegen-badge ${getSeverityClass(v.severity)}">${v.severity}</span> ${v.type}</h4>
        <p>${v.description}</p>
        ${v.exploit_scenario ? `
          <div class="securegen-exploit">
            <div class="securegen-exploit-title">Exploit Scenario</div>
            ${v.exploit_scenario}
          </div>
        ` : ''}
      </div>
    `).join('');
  } else {
    vulnsHtml = `<p style="color: #10B981; font-weight: 600;">No vulnerabilities detected!</p>`;
  }

  overlay.innerHTML = `
    <div class="securegen-modal">
      <div class="securegen-modal-header">
        <h3>${shieldIcon} SecureGen Analysis</h3>
        <button class="securegen-close-btn" id="securegen-close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="securegen-modal-body">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 24px;">Score: ${data.risk_score}/100</h2>
          <span class="securegen-badge ${getSeverityClass(data.overall_risk)}">${data.overall_risk}</span>
        </div>
        <p style="color: #D1D5DB; margin-top: 0;">${data.summary}</p>
        
        <h3 style="margin-top: 24px; margin-bottom: 8px;">Vulnerabilities</h3>
        ${vulnsHtml}

        ${data.secure_version ? `
          <h3 style="margin-top: 24px; margin-bottom: 8px;">Secure Alternative</h3>
          <div class="securegen-secure-code"><pre style="margin:0;"><code>${data.secure_version.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('securegen-close').addEventListener('click', () => {
    overlay.remove();
  });
}
