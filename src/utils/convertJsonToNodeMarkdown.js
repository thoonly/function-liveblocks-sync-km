

/**
 * Converts a structured paragraph JSON node into a plain markdown summary string.
 * Bold terms are inlined into the paragraph text at the double-space gaps left by
 * the XML parser's mixed-content extraction.
 *
 * @param {object} node - Input node with `paragraph` array (each item may have `bold` and `#text`)
 * @returns {string} Markdown-formatted summary text
 */
/**
 * Converts a structured document JSON node into a markdown string.
 * Pairs headings with their corresponding bulletlists by index.
 *
 * @param {object} node - Input node with `heading`, `bulletlist`, and `paragraph` arrays
 * @returns {string} Markdown-formatted string
 */
export function convertJsonToKeyThemes(node) {
  const headings = Array.isArray(node.heading) ? node.heading : node.heading ? [node.heading] : [];
  const bulletlists = Array.isArray(node.bulletlist) ? node.bulletlist : node.bulletlist ? [node.bulletlist] : [];
  const rawParagraphs = Array.isArray(node.paragraph) ? node.paragraph : node.paragraph ? [node.paragraph] : [];
  const paragraphs = rawParagraphs.filter((p) => typeof p === "string" && p.trim());

  const sections = [];
  const count = Math.max(headings.length, bulletlists.length, headings.length > 0 ? 1 : 0);

  for (let i = 0; i < count; i++) {
    const lines = [];

    if (headings[i]) {
      const level = parseInt(headings[i]["@_level"] ?? "1", 10);
      const prefix = "#".repeat(level);
      lines.push(`${prefix} ${headings[i]["#text"]}`);
      lines.push("");
    }

    const bulletlist = bulletlists[i];
    if (bulletlist) {
      const listitems = Array.isArray(bulletlist.listitem)
        ? bulletlist.listitem
        : bulletlist.listitem
        ? [bulletlist.listitem]
        : [];

      for (const item of listitems) {
        const p = item.paragraph;
        if (typeof p === "string") {
          lines.push(`- ${p}`);
        } else if (p) {
          const bold = p.bold ?? "";
          const text = p["#text"] ?? "";
          lines.push(bold ? `- **${bold}**${text}` : `- ${text.trim()}`);
        }
        lines.push("");
      }
    } else if (i === 0 && paragraphs.length > 0) {
      for (const p of paragraphs) {
        lines.push(p.trim());
      }
    }

    while (lines[lines.length - 1] === "") lines.pop();
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

export function convertJsonToNodeSummary(node) {
  const rawParagraphs = node.paragraph ?? [];
  const paragraphs = Array.isArray(rawParagraphs) ? rawParagraphs : [rawParagraphs];

  const parts = paragraphs
    .map((p) => {
      if (typeof p === "string") return p.trim();

      const bolds = p.bold ? (Array.isArray(p.bold) ? p.bold : [p.bold]) : [];
      let text = p["#text"] ?? "";

      for (const term of bolds) {
        text = text.replace("  ", ` **${term}** `);
      }

      return text.trim();
    })
    .filter(Boolean);

  return parts.join("\n\n");
}
