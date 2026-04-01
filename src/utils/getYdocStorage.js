import { Liveblocks } from '@liveblocks/node'
import { JSDOM } from 'jsdom'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown, MarkdownManager } from '@tiptap/markdown'
import { yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror'
import { defaultMarkdownSerializer } from 'prosemirror-markdown'
import * as Y from 'yjs'

import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Heading from '@tiptap/extension-heading'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import HardBreak from '@tiptap/extension-hard-break'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Code from '@tiptap/extension-code'
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list' // ✅ new in v3
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
// Add to your extensions array:

const extensions = ([
  Markdown,
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Heading.configure({ levels: [1, 2, 3] }),
  Blockquote,
  CodeBlock,
  HorizontalRule,
  HardBreak,
  Image,
  Link,
  Code,
  BulletList, ListItem, OrderedList, // ✅ includes bulletList + orderedList + listItem with Markdown support
  Table, TableCell, TableHeader, TableRow
  
])

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY
})
// 2. Build the ProseMirror schema from extensions
const schema = getSchema(extensions)

export const getYdocStorage = async (yjsDocument,field) => {
  try {
    const yDoc = new Y.Doc()
    Y.applyUpdate(yDoc, new Uint8Array(yjsDocument))
    const yxmlFragment = yDoc.getXmlFragment(field)
    const prosemirrorNode = yXmlFragmentToProseMirrorRootNode(yxmlFragment, schema)
    //  Convert ProseMirror Node → Tiptap JSON
    const tiptapJSON = prosemirrorNode.toJSON()
    //  Set up MarkdownManager with same extensions
    const markdownManager = new MarkdownManager()
    extensions.forEach((ext) => markdownManager.registerExtension(ext))

    //  Serialize JSON → Markdown
    const markdown = markdownManager.serialize(tiptapJSON)
    return markdown
  } catch (error) {
    console.log('Webhook Error', error)
  }
}

export const getYjsDocumentAsBinary = async (roomId) => {
  try {
    const result = await liveblocks.getYjsDocumentAsBinaryUpdate(roomId, {
      format: false
    })
    return result
  } catch (error) {
    console.error('Error fetching Yjs document:', error)
    throw error
  }
}