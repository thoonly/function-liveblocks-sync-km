import jwt from 'jsonwebtoken'

/**
 * Generates a custom access token signed with AUTH0_API_CLIENT_SECRET.
 *
 * @param {object} config - Azure App Config object (from loadAzureConfig)
 * @param {string} userId - The user ID to embed as `uid`
 * @returns {string} Signed JWT access token
 */
export function getCustomToken(config, userId) {
  const clientSecret = config.BE_JwtM2MStrategy?.SecretKey

  if (!clientSecret) {
    throw new Error('BE_JwtM2MStrategy:SecretKey is not set in config')
  }

  if (!userId) {
    throw new Error('userId is required')
  }

  const payload = {
    grant_type: 'client_credentials',
    uid: userId
  }

  return jwt.sign(payload, clientSecret, { expiresIn: '60m' })
}
