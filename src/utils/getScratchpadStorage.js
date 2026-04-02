export const convertLiveblocksToScratchPad = (liveblocks, existingData = null) => {
  const colorTagMap = {
    "#ff7d69": "Most Priority",
    "#88CEF7": "Backlog",
    "#fffa65": "Note",
  }

  const notes = Object.values(liveblocks?.whiteboard?.meshList ?? {})
    .filter(item => item.entityType === "PostIt")
    .sort((a, b) => a.order - b.order)
    .map(postIt => ({
      tag: colorTagMap[postIt?.color] ?? "Note",
      note_title: "PostIt",
      note_desc: postIt?.content,
      updated_by: postIt?.updatedBy,
      updated_at: postIt?.updatedAt
    }))

  const base = existingData ?? { left_data: { scratch_pad: { tags: [], categories: [] } } }
  const scratchPad = base.left_data.scratch_pad

  scratchPad.tags = notes.reduce((tags, { tag }) => {
    return tags.includes(tag) ? tags : [...tags, tag]
  }, scratchPad.tags)

  const categoryName = ""
  const { categories, found } = scratchPad.categories.reduce(
    ({ categories, found }, cat) => cat.name === categoryName
      ? { categories: [...categories, { ...cat, notes }], found: true }
      : { categories: [...categories, cat], found },
    { categories: [], found: false }
  )
  scratchPad.categories = found ? categories : [...categories, { name: categoryName, notes }]

  return base
}