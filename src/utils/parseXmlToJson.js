import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  // Preserve mixed content (e.g. <paragraph><bold>...</bold>: some text</paragraph>)
  isArray: (tagName) => tagName === "listitem" || tagName === "hardbreak",
  trimValues: false,
});

/**
 * Converts an XML string to a plain JSON object.
 *
 * @param {string} xml - XML string to parse
 * @returns {object} Parsed JSON object
 */
export function parseXmlToJson(xml) {
  return parser.parse(xml);
}
