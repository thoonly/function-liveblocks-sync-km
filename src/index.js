import { app } from '@azure/functions'
import { WebhookHandler } from '@liveblocks/node'
import { getLiveblocksStorage } from './services/liveblocks.js'
import { sendToExternalApi } from './services/externalApi.js'
import { parseXmlToJson } from './utils/parseXmlToJson.js'
import { convertJsonToNodeMarkdown } from './utils/convertJsonToNodeMarkdown.js'

const webhookYDocHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_YDOC_SECRET)
const webhookStorageHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_STORAGE_SECRET)
app.http('syncLiveblocksStorage', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'sync/{storageType}',
  handler: async (request, context) => {
    const storageType = request.params.storageType

    const VALID_STORAGE_TYPES = ['ydoc', 'storage']
    if (!storageType || !VALID_STORAGE_TYPES.includes(storageType)) {
      return {
        status: 400,
        jsonBody: {
          error: `Invalid storageType '${storageType}'. Supported types: ${VALID_STORAGE_TYPES.join(', ')}`
        }
      }
    }

    const rawBody = await request.text()

    const handler = storageType === 'ydoc' ? webhookYDocHandler : webhookStorageHandler

    let event
    try {
      event = handler.verifyRequest({
        headers: request.headers,
        rawBody,
      })
    } catch (err) {
      context.log(`Webhook verification failed: ${err.message}`)
      return {
        status: 400,
        jsonBody: { error: 'Could not verify webhook call' }
      }
    }

    const { type, data } = event
    const { appId, projectId, roomId, updatedAt } = data

    if (!roomId) {
      return {
        status: 400,
        jsonBody: { error: "'data.roomId' is required" }
      }
    }

    context.log(`Event: ${type} | Room: ${roomId} | StorageType: ${storageType}`)

    try {
      const storageData = await getLiveblocksStorage(roomId, { storageType }, context)
      context.log(`${storageType} fetched successfully for room: ${roomId}`)

      let result
      if (storageType === 'ydoc' && roomId==='liveblocks:examples:nextjs-yjs-tiptap') {
            context.log(`${storageType} fetched successfully for room: ${roomId}`)
        // const jsonInput = parseXmlToJson(storageData.input)
        // const jsonOutput = parseXmlToJson(storageData.output)
        // const markdownInput = convertJsonToNodeMarkdown(jsonInput)
        // const markdownOutput = convertJsonToNodeMarkdown(jsonOutput)
        // result = await sendToExternalApi({ markdownInput, markdownOutput }, { appId, projectId, roomId, updatedAt, type }, context)
        // context.log(`Data sent to external API successfully for room: ${roomId}`)
      }

      return {
        status: 200,
        jsonBody: {
          message: 'Sync completed successfully',
          roomId,
          externalApiResponse: result
        }
      }
    } catch (error) {
      context.log(`Error syncing room ${roomId}: ${error.message}`)

      if (error.status === 404) {
        return {
          status: 404,
          jsonBody: { error: `Room '${roomId}' not found in Liveblocks` }
        }
      }

      return {
        status: 500,
        jsonBody: { error: 'Internal server error', details: error.message }
      }
    }
  }
})
