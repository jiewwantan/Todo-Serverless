import 'source-map-support/register'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { generateUploadUrl } from '../../businessLogic/groups'
import { createLogger } from '../../utils/logger'
import { getToken } from '../utils'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

const logger = createLogger('generateUploadUrls')

export const handler = middy(
	async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
		logger.info('Executing generateUploadUrl event ...', {
			event
		})

		const todoId = event.pathParameters.todoId

		const jwtToken = getToken(event)

		const result = await generateUploadUrl(jwtToken, todoId)

		// Returning the presigned URL
		return {
			statusCode: result.statusCode,
			body: JSON.stringify({
				uploadUrl: result.body
			})
		}
	}
)

handler.use(
	cors({
		credentials: true
	})
)
