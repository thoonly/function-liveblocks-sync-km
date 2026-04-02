import { app } from '@azure/functions'
import { WebhookHandler } from '@liveblocks/node'
import { getLiveblocksStorage } from './services/liveblocks.js'
import { sendToExternalApi } from './services/externalApi.js'
import { getCustomToken } from './utils/getCustomToken.js'
import { getYdocStorage, getYjsDocumentAsBinary } from './utils/getYdocStorage.js'
import { convertLiveblocksToScratchPad } from './utils/getScratchpadStorage.js'
import { setScratchpadData, getScratchpadData, triggerWorkflow } from './services/upstash.js'
import { load } from '@azure/app-configuration-provider'
import { DefaultAzureCredential } from '@azure/identity'
// import { serve } from '@upstash/workflow'
// import { Receiver } from '@upstash/qstash'

const credential = new DefaultAzureCredential()
const connectionString = process.env.AZURE_APP_CONFIG_CONNECTION_STRING
async function loadAzureConfig() {
  return new Promise(async (resolve, reject) => {
    let settings

    settings = await load(connectionString, {
      selectors: [
        {
          keyFilter: 'BE_JwtM2MStrategy:SecretKey',
          labelFilter: 'CorpBE'
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
      if (storageType === 'ydoc' && roomId === 'c6cfbbab-6e2b-4822-a4db-a9bde64bdf31') {
        const yjsDocument = await getYjsDocumentAsBinary(roomId)
        const markdownKeyThemes = await getYdocStorage(yjsDocument, 'input')
        const markdownSummary = await getYdocStorage(yjsDocument, 'output')
        const updatedBy = await getYdocStorage(yjsDocument, 'updatedBy')
        if (updatedBy) {
          const accssToken = getCustomToken(config, updatedBy)
          result = await sendToExternalApi({ keyThemes: markdownKeyThemes, summary: markdownSummary }, { appId, projectId, roomId, updatedAt, type, accssToken }, context)
        }
      } else if (storageType === 'storage' && roomId === 'c6cfbbab-6e2b-4822-a4db-a9bde64bdf31') {
        const storageData = await getLiveblocksStorage(roomId, { storageType }, context)
        const existing = await getScratchpadData(roomId)
        result = convertLiveblocksToScratchPad(storageData, existing)
        await setScratchpadData(roomId, result)
        await triggerWorkflow({ roomId, data: result })
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


// const receiver = new Receiver({
//   currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
//   nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
// })

// const { handler: workflowHandler } = serve(async (workflowContext) => {
//   try {
//     const { roomId,data } = workflowContext.requestPayload
//     const result = await workflowContext.run('process-scratchpad',async () => {
//       console.log(data)
//       return { roomId, processed: true }
//     })
//     if (result.return) {
//       return  
//     }

//   } catch (error) {
//     error.message = `Workflow error: ${error.message}`
//     throw error
//   }
// }, { receiver })

// app.http('unStashWorkflow', {
//   methods: ['POST'],
//   authLevel: 'anonymous', // must be anonymous — QStash calls this endpoint directly
//   route: 'workflow',
//   handler: workflowHandler
// })
