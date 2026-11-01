import type { ParsedResumeDocument } from "@/types";

// ─── Helpers: Text Cleaning & Escaping ───────────────────────────────────────

function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-•▪◦‣]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSafeFileSlug(name: string): string {
  const clean = cleanText(name)
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .trim();
  return clean || "Tailored_Resume";
}

// ─── Print HTML Document Generator ──────────────────────────────────────────

export function generateResumePrintHtml(resume: ParsedResumeDocument): string {
  const candidateName = escapeHtml((cleanText(resume.candidateName) || "Candidate Name").toUpperCase());

  // Contact items
  const contactParts: string[] = [];
  if (resume.email) {
    contactParts.push(escapeHtml(cleanText(resume.email)));
  }
  if (resume.phone) {
    contactParts.push(escapeHtml(cleanText(resume.phone)));
  }
  if (resume.location) {
    contactParts.push(escapeHtml(cleanText(resume.location)));
  }
  if (Array.isArray(resume.links)) {
    for (const link of resume.links) {
      const cleanLink = cleanText(link);
      if (!cleanLink) continue;
      const href = cleanLink.startsWith("http") ? cleanLink : `https://${cleanLink}`;
      contactParts.push(
        `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer" style="color: #2563eb; text-decoration: underline;">${escapeHtml(cleanLink)}</a>`
      );
    }
  }

  // Summary
  const summaryText = cleanText(resume.summary);
  const isSummaryDistinct =
    summaryText.length > 15 &&
    !summaryText.includes(resume.email || "___") &&
    !summaryText.includes(resume.phone || "___");

  // Build Sections
  let sectionsHtml = "";

  // 1. Professional Summary
  if (isSummaryDistinct) {
    sectionsHtml += `
      <section class="print-section-block">
        <h3 class="print-section-header">Professional Summary</h3>
        <p class="print-body-text">${escapeHtml(summaryText)}</p>
      </section>
    `;
  }

  // 2. Education
  if (Array.isArray(resume.education) && resume.education.length > 0) {
    let eduEntriesHtml = "";
    for (const edu of resume.education) {
      const title = escapeHtml(cleanText(edu.title));
      const subtitle = escapeHtml(cleanText(edu.subtitle));
      const dateRange = escapeHtml(cleanText(edu.dateRange));
      const score = escapeHtml(cleanText(edu.scoreOrMeta));

      eduEntriesHtml += `
        <article class="print-entry-block">
          <div class="print-entry-header">
            <div>
              <span class="print-entry-title">${title}</span>
              ${subtitle ? `<span class="print-entry-subtitle"> | ${subtitle}</span>` : ""}
            </div>
            ${dateRange ? `<span class="print-entry-date">${dateRange}</span>` : ""}
          </div>
          ${score ? `<div class="print-entry-meta">${score}</div>` : ""}
          ${
            Array.isArray(edu.bullets) && edu.bullets.length > 0
              ? `<ul class="print-bullet-list">
                  ${edu.bullets
                    .map((b) => `<li class="print-bullet-item">${escapeHtml(cleanText(b.text))}</li>`)
                    .join("")}
                </ul>`
              : ""
          }
        </article>
      `;
    }

    sectionsHtml += `
      <section class="print-section-block">
        <h3 class="print-section-header">Education</h3>
        <div class="print-entries-container">${eduEntriesHtml}</div>
      </section>
    `;
  }

  // 3. Work Experience
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    let expEntriesHtml = "";
    for (const exp of resume.experience) {
      const title = escapeHtml(cleanText(exp.title));
      const subtitle = escapeHtml(cleanText(exp.subtitle));
      const dateRange = escapeHtml(cleanText(exp.dateRange));
      const location = escapeHtml(cleanText(exp.location));

      let bulletsHtml = "";
      if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
        bulletsHtml = `
          <ul class="print-bullet-list">
            ${exp.bullets
              .map((b) => `<li class="print-bullet-item">${escapeHtml(cleanText(b.text))}</li>`)
              .join("")}
          </ul>
        `;
      }

      expEntriesHtml += `
        <article class="print-entry-block">
          <div class="print-entry-header">
            <div>
              <span class="print-entry-title">${title}</span>
              ${subtitle ? `<span class="print-entry-subtitle"> | ${subtitle}</span>` : ""}
              ${location ? `<span class="print-entry-location"> (${location})</span>` : ""}
            </div>
            ${dateRange ? `<span class="print-entry-date">${dateRange}</span>` : ""}
          </div>
          ${bulletsHtml}
        </article>
      `;
    }

    sectionsHtml += `
      <section class="print-section-block">
        <h3 class="print-section-header">Work Experience</h3>
        <div class="print-entries-container">${expEntriesHtml}</div>
      </section>
    `;
  }

  // 4. Projects
  if (Array.isArray(resume.projects) && resume.projects.length > 0) {
    let projEntriesHtml = "";
    for (const proj of resume.projects) {
      const title = escapeHtml(cleanText(proj.title));
      const subtitle = escapeHtml(cleanText(proj.subtitle));
      const dateRange = escapeHtml(cleanText(proj.dateRange));

      let bulletsHtml = "";
      if (Array.isArray(proj.bullets) && proj.bullets.length > 0) {
        bulletsHtml = `
          <ul class="print-bullet-list">
            ${proj.bullets
              .map((b) => `<li class="print-bullet-item">${escapeHtml(cleanText(b.text))}</li>`)
              .join("")}
          </ul>
        `;
      }

      projEntriesHtml += `
        <article class="print-entry-block">
          <div class="print-entry-header">
            <div>
              <span class="print-entry-title">${title}</span>
              ${subtitle ? `<span class="print-entry-subtitle"> | ${subtitle}</span>` : ""}
            </div>
            ${dateRange ? `<span class="print-entry-date">${dateRange}</span>` : ""}
          </div>
          ${bulletsHtml}
        </article>
      `;
    }

    sectionsHtml += `
      <section class="print-section-block">
        <h3 class="print-section-header">Projects</h3>
        <div class="print-entries-container">${projEntriesHtml}</div>
      </section>
    `;
  }

  // 5. Technical Skills
  const hasCategories = Array.isArray(resume.skillCategories) && resume.skillCategories.length > 0;
  const hasSkills = Array.isArray(resume.skills) && resume.skills.length > 0;

  if (hasCategories || hasSkills) {
    let skillsContentHtml = "";
    if (hasCategories) {
      skillsContentHtml = resume.skillCategories
        .map(
          (group) => `
            <div class="print-skill-group">
              <strong class="print-skill-category">${escapeHtml(cleanText(group.category))}:</strong>
              <span class="print-skill-list">${escapeHtml(group.skills.map(cleanText).filter(Boolean).join(", "))}</span>
            </div>
          `
        )
        .join("");
    } else {
      skillsContentHtml = `
        <p class="print-skill-list">${escapeHtml(resume.skills.map(cleanText).filter(Boolean).join(", "))}</p>
      `;
    }

    sectionsHtml += `
      <section class="print-section-block">
        <h3 class="print-section-header">Technical Skills</h3>
        <div class="print-skills-container">${skillsContentHtml}</div>
      </section>
    `;
  }

  // 6. Custom Sections (Achievements, Certifications, etc.)
  if (Array.isArray(resume.customSections)) {
    for (const custom of resume.customSections) {
      if (!Array.isArray(custom.items) || custom.items.length === 0) continue;
      const heading = escapeHtml(cleanText(custom.heading) || "Additional Information");
      sectionsHtml += `
        <section class="print-section-block">
          <h3 class="print-section-header">${heading}</h3>
          <ul class="print-bullet-list">
            ${custom.items
              .map((item) => `<li class="print-bullet-item">${escapeHtml(cleanText(item.text))}</li>`)
              .join("")}
          </ul>
        </section>
      `;
    }
  }

  return `
    <div class="resume-document-container">
      <header class="print-resume-header">
        <h1 class="print-candidate-name">${candidateName}</h1>
        ${
          contactParts.length > 0
            ? `<div class="print-contact-line">${contactParts.join(' <span class="print-divider">|</span> ')}</div>`
            : ""
        }
      </header>
      <div class="print-resume-body">
        ${sectionsHtml}
      </div>
    </div>
  `;
}

// ─── Scoped Print Styles for A4 Isolation ────────────────────────────────────

const PRINT_OVERRIDE_CSS = `
  @page {
    size: A4 portrait;
    margin: 0mm !important;
  }
  @media screen {
    #resume-isolated-print-root {
      display: none !important;
    }
  }
  @media print {
    html, body {
      width: 210mm !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Completely remove the Next.js app shell from layout flow */
    body > *:not(#resume-isolated-print-root) {
      display: none !important;
      height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #resume-isolated-print-root {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: static !important;
      width: 210mm !important;
      max-width: 210mm !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      padding: 12mm 14mm 12mm 14mm !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 9.5pt !important;
      line-height: 1.45 !important;
    }
    #resume-isolated-print-root * {
      visibility: visible !important;
      box-sizing: border-box !important;
    }
    .resume-document-container {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .print-resume-header {
      text-align: center !important;
      border-bottom: 1.25px solid #0f172a !important;
      padding-bottom: 6px !important;
      margin-bottom: 8px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-candidate-name {
      font-size: 18pt !important;
      font-weight: 800 !important;
      letter-spacing: -0.02em !important;
      color: #0f172a !important;
      margin: 0 0 4px 0 !important;
      text-transform: uppercase !important;
    }
    .print-contact-line {
      font-size: 9pt !important;
      color: #334155 !important;
      margin: 0 !important;
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      gap: 6px !important;
    }
    .print-contact-line a {
      color: #0f172a !important;
      text-decoration: none !important;
    }
    .print-divider {
      color: #94a3b8 !important;
    }
    .print-section-block {
      margin-top: 8px !important;
      margin-bottom: 6px !important;
    }
    .print-section-header {
      font-size: 10pt !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      color: #0f172a !important;
      border-bottom: 1px solid #cbd5e1 !important;
      padding-bottom: 2px !important;
      margin: 0 0 5px 0 !important;
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .print-body-text {
      font-size: 9.5pt !important;
      line-height: 1.45 !important;
      color: #1e293b !important;
      margin: 0 !important;
    }
    .print-entries-container {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }
    .print-entry-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 4px !important;
    }
    .print-entry-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      font-size: 9.5pt !important;
      color: #0f172a !important;
      margin-bottom: 2px !important;
    }
    .print-entry-title {
      font-weight: 700 !important;
      color: #0f172a !important;
    }
    .print-entry-subtitle {
      font-weight: 500 !important;
      color: #334155 !important;
    }
    .print-entry-location {
      font-size: 8.5pt !important;
      color: #64748b !important;
    }
    .print-entry-date {
      font-size: 8.5pt !important;
      font-weight: 500 !important;
      color: #475569 !important;
      text-align: right !important;
      white-space: nowrap !important;
      margin-left: 8px !important;
    }
    .print-entry-meta {
      font-size: 9pt !important;
      color: #475569 !important;
      font-style: italic !important;
      margin-bottom: 2px !important;
    }
    .print-bullet-list {
      list-style-type: disc !important;
      padding-left: 18px !important;
      margin: 2px 0 4px 0 !important;
    }
    .print-bullet-item {
      font-size: 9.5pt !important;
      line-height: 1.45 !important;
      color: #1e293b !important;
      margin-bottom: 2px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-skills-container {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }
    .print-skill-group {
      font-size: 9.5pt !important;
      line-height: 1.4 !important;
      color: #1e293b !important;
    }
    .print-skill-category {
      font-weight: 600 !important;
      color: #0f172a !important;
    }
    .print-skill-list {
      color: #1e293b !important;
    }
  }
`;

// ─── Mechanism 1: Direct DOM Isolated Print Mount ────────────────────────────

export function printIsolatedResume(resume: ParsedResumeDocument): void {
  if (typeof window === "undefined" || !document) return;

  // 1. Commit active editor focus
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement) {
    activeEl.blur();
  }

  // 2. Set clean document title for the PDF file name
  const originalTitle = document.title;
  const fileSlug = getSafeFileSlug(resume.candidateName);
  document.title = `${fileSlug}_Tailored_Resume`;

  // 3. Remove any previous isolated elements
  const oldStyle = document.getElementById("PrintIsolationOverride");
  if (oldStyle) oldStyle.remove();

  const oldRoot = document.getElementById("resume-isolated-print-root");
  if (oldRoot) oldRoot.remove();

  // 4. Inject scoped print style override
  const styleEl = document.createElement("style");
  styleEl.id = "PrintIsolationOverride";
  styleEl.textContent = PRINT_OVERRIDE_CSS;
  document.head.appendChild(styleEl);

  // 5. Mount isolated print root directly as a child of document.body
  const printRoot = document.createElement("div");
  printRoot.id = "resume-isolated-print-root";
  printRoot.innerHTML = generateResumePrintHtml(resume);
  document.body.appendChild(printRoot);

  // 6. Cleanup handler
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.title = originalTitle;
    if (styleEl.parentElement) styleEl.remove();
    if (printRoot.parentElement) printRoot.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // 7. Request frame and invoke native browser print dialog
  window.requestAnimationFrame(() => {
    try {
      window.print();
      // Safety fallback timer if afterprint doesn't fire
      window.setTimeout(cleanup, 45_000);
    } catch {
      cleanup();
    }
  });
}

// ─── Mechanism 2: Standalone Full-Geometry Window / Popup Fallback ───────────

export function openStandalonePrintWindow(resume: ParsedResumeDocument): boolean {
  if (typeof window === "undefined") return false;

  const fileSlug = getSafeFileSlug(resume.candidateName);
  const printWindow = window.open("", "_blank", "width=850,height=1100");
  if (!printWindow) return false;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(fileSlug)}_Tailored_Resume</title>
  <style>
    ${PRINT_OVERRIDE_CSS}
    /* Apply print styles directly in standalone window */
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #resume-isolated-print-root {
      display: block !important;
      padding: 12mm 14mm !important;
      max-width: 210mm;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="resume-isolated-print-root">
    ${generateResumePrintHtml(resume)}
  </div>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

// ─── Mechanism 3: Pure Vector PDF-1.4 File Downloader ────────────────────────

export function downloadDirectPdf(resume: ParsedResumeDocument): void {
  if (typeof window === "undefined") return;

  const candidateName = cleanText(resume.candidateName) || "Candidate Name";
  const fileSlug = getSafeFileSlug(candidateName);

  // A4 dimensions in PDF points (72 pt/inch)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 38;
  const marginTop = 38;
  const marginBottom = 38;
  const contentWidth = pageWidth - marginX * 2;

  const pages: string[] = [];
  let currentOps: string[] = [];
  let y = pageHeight - marginTop;

  function newPage() {
    if (currentOps.length > 0) {
      pages.push(currentOps.join("\n"));
      currentOps = [];
    }
    y = pageHeight - marginTop;
  }

  function ensureSpace(needed: number) {
    if (y - needed < marginBottom) {
      newPage();
    }
  }

  function escapePdfString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, " ");
  }

  function wrapText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length <= maxChars) {
        cur = (cur + " " + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function renderSectionHeader(title: string) {
    ensureSpace(32);
    y -= 6;
    currentOps.push(`BT /F2 10.5 Tf 0.06 0.09 0.16 rg ${marginX} ${y} Td (${escapePdfString(title.toUpperCase())}) Tj ET`);
    y -= 3;
    currentOps.push(`0.8 0.83 0.88 RG 0.5 w ${marginX} ${y} m ${marginX + contentWidth} ${y} l S`);
    y -= 12;
  }

  // 1. Header (Candidate Name)
  currentOps.push(`BT /F2 16 Tf 0.06 0.09 0.16 rg ${marginX} ${y} Td (${escapePdfString(candidateName.toUpperCase())}) Tj ET`);
  y -= 18;

  // 2. Contact Line
  const contactItems = [
    cleanText(resume.email),
    cleanText(resume.phone),
    cleanText(resume.location),
    ...(Array.isArray(resume.links) ? resume.links.map(cleanText).filter(Boolean) : [])
  ].filter(Boolean);

  if (contactItems.length > 0) {
    const contactStr = contactItems.join("  |  ");
    currentOps.push(`BT /F1 9 Tf 0.2 0.25 0.35 rg ${marginX} ${y} Td (${escapePdfString(contactStr)}) Tj ET`);
    y -= 12;
  }

  // Horizontal divider rule
  currentOps.push(`0.8 0.83 0.88 RG 0.75 w ${marginX} ${y} m ${marginX + contentWidth} ${y} l S`);
  y -= 12;

  // 3. Professional Summary
  const summary = cleanText(resume.summary);
  if (summary.length > 15 && !summary.includes(resume.email || "___")) {
    renderSectionHeader("Professional Summary");
    const summaryLines = wrapText(summary, 95);
    for (const sLine of summaryLines) {
      ensureSpace(12);
      currentOps.push(`BT /F1 9.5 Tf 0.12 0.16 0.23 rg ${marginX} ${y} Td (${escapePdfString(sLine)}) Tj ET`);
      y -= 12.5;
    }
  }

  // 4. Work Experience
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    renderSectionHeader("Work Experience");
    for (const exp of resume.experience) {
      ensureSpace(28);
      const titleLine = cleanText(exp.title) + (exp.subtitle ? " | " + cleanText(exp.subtitle) : "");
      currentOps.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg ${marginX} ${y} Td (${escapePdfString(titleLine)}) Tj ET`);
      if (exp.dateRange) {
        currentOps.push(`BT /F1 8.5 Tf 0.35 0.4 0.5 rg ${marginX + contentWidth - 110} ${y} Td (${escapePdfString(cleanText(exp.dateRange))}) Tj ET`);
      }
      y -= 13;

      for (const bullet of exp.bullets || []) {
        const bulletLines = wrapText(cleanText(bullet.text), 90);
        for (let i = 0; i < bulletLines.length; i++) {
          ensureSpace(12);
          const prefix = i === 0 ? "- " : "  ";
          currentOps.push(`BT /F1 9 Tf 0.12 0.16 0.23 rg ${marginX + 6} ${y} Td (${escapePdfString(prefix + bulletLines[i])}) Tj ET`);
          y -= 12;
        }
      }
      y -= 4;
    }
  }

  // 5. Projects
  if (Array.isArray(resume.projects) && resume.projects.length > 0) {
    renderSectionHeader("Projects");
    for (const proj of resume.projects) {
      ensureSpace(28);
      const titleLine = cleanText(proj.title) + (proj.subtitle ? " | " + cleanText(proj.subtitle) : "");
      currentOps.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg ${marginX} ${y} Td (${escapePdfString(titleLine)}) Tj ET`);
      if (proj.dateRange) {
        currentOps.push(`BT /F1 8.5 Tf 0.35 0.4 0.5 rg ${marginX + contentWidth - 110} ${y} Td (${escapePdfString(cleanText(proj.dateRange))}) Tj ET`);
      }
      y -= 13;

      for (const bullet of proj.bullets || []) {
        const bulletLines = wrapText(cleanText(bullet.text), 90);
        for (let i = 0; i < bulletLines.length; i++) {
          ensureSpace(12);
          const prefix = i === 0 ? "- " : "  ";
          currentOps.push(`BT /F1 9 Tf 0.12 0.16 0.23 rg ${marginX + 6} ${y} Td (${escapePdfString(prefix + bulletLines[i])}) Tj ET`);
          y -= 12;
        }
      }
      y -= 4;
    }
  }

  // 6. Technical Skills
  const hasCategories = Array.isArray(resume.skillCategories) && resume.skillCategories.length > 0;
  const hasSkills = Array.isArray(resume.skills) && resume.skills.length > 0;
  if (hasCategories || hasSkills) {
    renderSectionHeader("Technical Skills");
    if (hasCategories) {
      for (const cat of resume.skillCategories) {
        ensureSpace(14);
        const catText = `${cleanText(cat.category)}: ${cat.skills.map(cleanText).filter(Boolean).join(", ")}`;
        const catLines = wrapText(catText, 92);
        for (const line of catLines) {
          ensureSpace(12);
          currentOps.push(`BT /F1 9 Tf 0.12 0.16 0.23 rg ${marginX} ${y} Td (${escapePdfString(line)}) Tj ET`);
          y -= 12;
        }
      }
    } else {
      const skillsText = resume.skills.map(cleanText).filter(Boolean).join(", ");
      const skillLines = wrapText(skillsText, 92);
      for (const line of skillLines) {
        ensureSpace(12);
        currentOps.push(`BT /F1 9 Tf 0.12 0.16 0.23 rg ${marginX} ${y} Td (${escapePdfString(line)}) Tj ET`);
        y -= 12;
      }
    }
  }

  // 7. Education
  if (Array.isArray(resume.education) && resume.education.length > 0) {
    renderSectionHeader("Education");
    for (const edu of resume.education) {
      ensureSpace(20);
      const titleLine =
        cleanText(edu.title) +
        (edu.subtitle ? " | " + cleanText(edu.subtitle) : "") +
        (edu.scoreOrMeta ? " (" + cleanText(edu.scoreOrMeta) + ")" : "");
      currentOps.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg ${marginX} ${y} Td (${escapePdfString(titleLine)}) Tj ET`);
      if (edu.dateRange) {
        currentOps.push(`BT /F1 8.5 Tf 0.35 0.4 0.5 rg ${marginX + contentWidth - 110} ${y} Td (${escapePdfString(cleanText(edu.dateRange))}) Tj ET`);
      }
      y -= 13;
    }
  }

  // 8. Custom Sections
  if (Array.isArray(resume.customSections)) {
    for (const custom of resume.customSections) {
      if (!Array.isArray(custom.items) || custom.items.length === 0) continue;
      renderSectionHeader(cleanText(custom.heading) || "Additional Information");
      for (const item of custom.items) {
        const itemLines = wrapText(cleanText(item.text), 90);
        for (let i = 0; i < itemLines.length; i++) {
          ensureSpace(12);
          const prefix = i === 0 ? "- " : "  ";
          currentOps.push(`BT /F1 9 Tf 0.12 0.16 0.23 rg ${marginX + 6} ${y} Td (${escapePdfString(prefix + itemLines[i])}) Tj ET`);
          y -= 12;
        }
      }
    }
  }

  if (currentOps.length > 0) {
    pages.push(currentOps.join("\n"));
  }

  // Construct standard PDF 1.4 byte payload
  const pdfChunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let byteOffset = 0;

  const encoder = new TextEncoder();
  function write(str: string) {
    const bytes = encoder.encode(str);
    pdfChunks.push(bytes);
    byteOffset += bytes.length;
  }

  write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const numPages = pages.length;
  const pageObjNums: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageObjNums.push(5 + 2 * i);
  }

  // Obj 1: Catalog
  offsets[1] = byteOffset;
  write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2: Pages
  offsets[2] = byteOffset;
  write(`2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => n + " 0 R").join(" ")}] /Count ${numPages} >>\nendobj\n`);

  // Obj 3: Font F1 (Helvetica)
  offsets[3] = byteOffset;
  write("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

  // Obj 4: Font F2 (Helvetica-Bold)
  offsets[4] = byteOffset;
  write("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

  for (let i = 0; i < numPages; i++) {
    const pageNum = 5 + 2 * i;
    const contentNum = 6 + 2 * i;
    const streamContent = pages[i];
    const streamBytes = encoder.encode(streamContent);

    // Page object
    offsets[pageNum] = byteOffset;
    write(`${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`);

    // Content stream
    offsets[contentNum] = byteOffset;
    write(`${contentNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`);
  }

  const totalObjects = 4 + numPages * 2;
  const xrefOffset = byteOffset;

  write(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjects; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    write(`${off} 00000 n \n`);
  }

  write(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Combine chunks into single ArrayBuffer and trigger download
  const blob = new Blob(pdfChunks as BlobPart[], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileSlug}_Tailored_Resume.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

