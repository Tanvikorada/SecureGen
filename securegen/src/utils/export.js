export function generateMarkdownReport(result, originalCode, language) {
  const date = new Date().toLocaleString();
  
  let md = `# SecureGen Analysis Report
**Date:** ${date}
**Overall Risk:** ${result.overall_risk.toUpperCase()}
**Risk Score:** ${result.risk_score}/100

## Summary
${result.summary}

---

## Original Code
\`\`\`${language}
${originalCode}
\`\`\`

---

## Detected Vulnerabilities
`;

  if (result.vulnerabilities && result.vulnerabilities.length > 0) {
    result.vulnerabilities.forEach((vuln) => {
      md += `
### ${vuln.type} (${vuln.severity.toUpperCase()})
- **Location:** \`${vuln.line_reference || 'N/A'}\`
- **CVSS Score:** ${vuln.cvss_score || 'N/A'}
- **OWASP Category:** ${vuln.owasp_category || 'N/A'}

**Description:**
${vuln.description}

**Exploit Scenario:**
> ${vuln.exploit_scenario}

`;
    });
  } else {
    md += `*No vulnerabilities detected.*\n\n`;
  }

  md += `---

## Secure Alternative
\`\`\`${language}
${result.secure_version}
\`\`\`

### Changes Made
`;

  if (result.changes_made && result.changes_made.length > 0) {
    result.changes_made.forEach((change, i) => {
      md += `${i + 1}. ${change}\n`;
    });
  } else {
    md += `*None*\n`;
  }

  md += `
### Why AI Generates This
`;

  if (result.ai_generation_patterns && result.ai_generation_patterns.length > 0) {
    result.ai_generation_patterns.forEach((pattern) => {
      md += `- ${pattern}\n`;
    });
  } else {
    md += `*N/A*\n`;
  }

  return md;
}

export function downloadReport(result, originalCode, language) {
  const mdContent = generateMarkdownReport(result, originalCode, language);
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `SecureGen_Report_${new Date().getTime()}.md`;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
