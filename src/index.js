import { app } from '@azure/functions'
import { WebhookHandler } from '@liveblocks/node'
import { getLiveblocksStorage } from './services/liveblocks.js'
import { sendToExternalApi } from './services/externalApi.js'
import { parseXmlToJson } from './utils/parseXmlToJson.js'
import { getCustomToken } from './utils/getCustomToken.js'
import { getYdocStorage, getYjsDocumentAsBinary } from './utils/getYdocStorage.js'
import { load } from '@azure/app-configuration-provider'
import { DefaultAzureCredential } from '@azure/identity'

const credential = new DefaultAzureCredential()
const connectionString = process.env.AZURE_APP_CONFIG_CONNECTION_STRING
async function loadAzureConfig() {
  return new Promise(async (resolve, reject) => {
    let settings

    settings = await load(connectionString, {
      selectors: [
        {
          keyFilter: 'AUTH0_API_CLIENT_SECRET',
          labelFilter: 'Api'
        }
      ],
      trimKeyPrefixes: ['ConnectionStrings:'],
      keyVaultOptions: {
        credential: credential
      }
    })
    const config = settings.constructConfigurationObject({
      separator: ':'
    })
    // console.log(config)
    resolve(config)
  })
}

const config = await loadAzureConfig()

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
    if (process.env.SKIP_WEBHOOK_VERIFY === 'true') {
      context.log('Webhook verification skipped (SKIP_WEBHOOK_VERIFY=true)')
      event = JSON.parse(rawBody)
    } else {
      try {
        event = handler.verifyRequest({
          headers: request.headers,
          rawBody
        })
      } catch (err) {
        context.log(`Webhook verification failed: ${err.message}`)
        return {
          status: 400,
          jsonBody: { error: 'Could not verify webhook call' }
        }
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
      let result
      if (storageType === 'ydoc' && roomId === '19bbef8e-7815-48e3-8882-29db1f2ecc51') {
        const yjsDocument = await getYjsDocumentAsBinary(roomId)
        const markdownKeyThemes = await getYdocStorage(yjsDocument, 'input')
        const markdownSummary = await getYdocStorage(yjsDocument, 'output')
        const updatedBy = await getYdocStorage(yjsDocument, 'updatedBy')
        if (updatedBy) {
          const accssToken = getCustomToken(config, updatedBy)
          result = await sendToExternalApi({ keyThemes: markdownKeyThemes, summary: markdownSummary }, { appId, projectId, roomId, updatedAt, type, accssToken }, context)
        }
      } else if (storageType === 'storage' && roomId === '19bbef8e-7815-48e3-8882-29db1f2ecc51') {
        const storageData = await getLiveblocksStorage(roomId, { storageType }, context)
        console.log('Liveblocks storage data:', JSON.stringify(storageData))
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
