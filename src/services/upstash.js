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

export const triggerWorkflow = async (body) => {
  return await workflowClient.trigger({
    url: 'https://superabstract-mariel-persuasive.ngrok-free.dev/api/workflow',
    body,
    headers: { 'Content-Type': 'application/json', 'Upstash-Feature-Set': 'WF_TriggerOnConfig', 'Upstash-Workflow-Invoke-Count': '0', 'Upstash-Workflow-Sdk-Version': '1' },
    delay: 1000, // Delay in milliseconds before the workflow is executed
    keepTriggerConfig: true
  })
}
