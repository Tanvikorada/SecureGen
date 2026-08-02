document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const groqSection = document.getElementById('groqSection');
  const geminiSection = document.getElementById('geminiSection');
  
  const groqApiKeyInput = document.getElementById('groqApiKey');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Toggle sections based on provider
  providerSelect.addEventListener('change', (e) => {
    if (e.target.value === 'groq') {
      groqSection.style.display = 'block';
      geminiSection.style.display = 'none';
    } else {
      groqSection.style.display = 'none';
      geminiSection.style.display = 'block';
    }
  });

  // Load existing settings
  chrome.storage.local.get(['provider', 'groqApiKey', 'geminiApiKey'], (result) => {
    if (result.provider) {
      providerSelect.value = result.provider;
      providerSelect.dispatchEvent(new Event('change'));
    }
    if (result.groqApiKey) groqApiKeyInput.value = result.groqApiKey;
    if (result.geminiApiKey) geminiApiKeyInput.value = result.geminiApiKey;
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const provider = providerSelect.value;
    const groqKey = groqApiKeyInput.value.trim();
    const geminiKey = geminiApiKeyInput.value.trim();

    chrome.storage.local.set({ 
      provider: provider,
      groqApiKey: groqKey,
      geminiApiKey: geminiKey
    }, () => {
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2000);
    });
  });
});
