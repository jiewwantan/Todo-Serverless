
import {CustomAuthorizerEvent, CustomAuthorizerHandler, CustomAuthorizerResult} from 'aws-lambda'
import 'source-map-support/register'

import { verify, decode } from 'jsonwebtoken'
import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'
import jwkToPem from 'jwk-to-pem'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'

const logger = createLogger('auth')

const jwksUrl = 'https://dev-qkqz2p82.us.auth0.com/.well-known/jwks.json'

export const handler: CustomAuthorizerHandler = async (
	event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
	try {
		const jwtToken = await verifyToken(event.authorizationToken)
		logger.info('User was authorized', { jwtToken: jwtToken })
		return {
			principalId: jwtToken.sub,
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Action: 'execute-api:Invoke',
						Effect: 'Allow',
						Resource: '*'
					}
				]
			}
		}
	} catch (e) {
		logger.error('User was not authorized', { error: e.message })
		return {
			principalId: 'user',
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Action: 'execute-api:Invoke',
						Effect: 'Deny',
						Resource: '*'
					}
				]
			}
		}
	}
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
	const token = getToken(authHeader)
	const jwt: Jwt = decode(token, { complete: true }) as Jwt
	if (!jwt) throw new Error('Token is invalid')
  
	const res = await Axios.get(jwksUrl);
	const pem = jwkToPem(res['data']['keys'][0])
	var verifed = verify(token, pem, {algorithms: ['RS256']})
	return verifed as JwtPayload
}
  

function getToken(authHeader: string): string {
	if (!authHeader) throw new Error('No authentication header')

	if (!authHeader.toLowerCase().startsWith('bearer '))
		throw new Error('Invalid authentication header')

	const split = authHeader.split(' ')
	const token = split[1]

	return token
}
