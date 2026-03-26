import axios from 'axios'

/**
 * Sends Liveblocks storage data to the external REST API.
 * @param {object} context - Azure Function context for logging
 * @returns {Promise<object>} Response from the external API
 */
export async function sendToExternalApi(markdown, metadata, context) {
  const apiUrl = process.env.EXTERNAL_API_URL
  const apiKey = process.env.EXTERNAL_API_KEY

  if (!apiUrl) {
    throw new Error('EXTERNAL_API_URL environment variable is not set')
  }

  context.log(`Sending storage data to external API: ${apiUrl}`)

  const payload = {
    left_data: {
      key_themes: markdown.markdownInput
    },
    right: {
      markdown: markdown.markdownOutput
    }
  }

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` })
      }
    })

    return response.data
  } catch (error) {
    if (error.response) {
      const err = new Error(`External API error: ${error.response.status} ${error.response.statusText}`)
      err.status = error.response.status
      throw err
    }
    throw new Error(`Failed to reach external API: ${error.message}`)
  }
}
