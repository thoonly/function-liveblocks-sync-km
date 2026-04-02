import { Redis } from '@upstash/redis'
import { Client } from '@upstash/workflow'

const workflowClient = new Client({
  baseUrl: process.env.UPSTASH_WORKFLOW_BASE_URL,
  token: process.env.QSTASH_TOKEN
})

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export const setScratchpadData = async (roomId, data) => {
  const key = `scratchpad:${roomId}`
  await redis.set(key, data)
}

export const getScratchpadData = async (roomId) => {
  const key = `scratchpad:${roomId}`
  return await redis.get(key)
}

export const triggerWorkflow = async (roomId,body) => {
  return await workflowClient.trigger({
    url: `https://superabstract-mariel-persuasive.ngrok-free.dev/api/workflow/${roomId}`,
    label: 'custom-label',
    body,
    headers: {
      'Content-Type': 'application/json'
    },
    delay: '5s', // Delay in seconds before the workflow is executed
    keepTriggerConfig: true
  })
}
