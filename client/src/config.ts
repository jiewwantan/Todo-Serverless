const apiId = 'o1s4pjlxc5'
const apiRegion = 'ap-southeast-1'
export const apiEndpoint = `https://${apiId}.execute-api.${apiRegion}.amazonaws.com/dev`

export const authConfig = {
  domain: 'dev-qkqz2p82.us.auth0.com',                   // Auth0 domain
  clientId: 'BMDxuhe9TbvQOkz7M1wEu3jOjmLuxBWM',          // Auth0 client id
  callbackUrl: 'http://localhost:3000/callback'
}

