/**
 * Converts a structured heading/bulletlist JSON node into a left_data object
 * with a markdown-formatted key_themes string.
 *
 * @param {object} node - Input node with `heading` and `bulletlist.listitem` fields
 * @returns {{ left_data: { key_themes: string } }}
 */
export function convertJsonToNodeMarkdown(node) {
  const heading =
    typeof node.heading === "object"
      ? (node.heading["#text"] ?? "")
      : (node.heading ?? "");
  const items = node.bulletlist?.listitem ?? [];

  const bullets = items.map((item) => {
    const para = item.paragraph;

    if (typeof para === "string") {
      return `- ${para}`;
    }

    const bold = para?.bold;
    const text = para?.["#text"] ?? "";

    if (bold) {
      return `- **${bold}**${text}`;
    }

    return `- ${text}`;
  });

  const rawParagraphs = node.paragraph ?? [];
  const paragraphs = (Array.isArray(rawParagraphs) ? rawParagraphs : [rawParagraphs])
    .filter((p) => typeof p === "string" && p.trim() !== "");

  const parts = [`# ${heading}`, bullets.join("\n\n"), ...paragraphs];
  const key_themes = parts.filter(Boolean).join("\n\n");

  return { left_data: { key_themes } };
}
