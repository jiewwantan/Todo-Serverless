import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const XAWS = AWSXRay.captureAWS(AWS)
const logger = createLogger('todosAccess')

export class DataLayerAccess {
	constructor(
		private readonly docClient: DocumentClient = createDynamoDBClient(),
		private readonly todosTable = process.env.TODOS_DB,
		private readonly s3 = new AWS.S3({ signatureVersion: 'v4' }),
		private readonly s3Bucket = process.env.TODOS_S3_BUCKET,
		private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION
	) {}

	async getTodos(userId): Promise<TodoItem[]> {
		const result = await this.docClient
			.query({
				TableName: this.todosTable,
				KeyConditionExpression: 'userId = :userId',
				ExpressionAttributeValues: {
					':userId': userId
				}
			})
			.promise()

		logger.info('Result', result)

		const items = result.Items
		return items as TodoItem[]
	}

	async deleteItem(userId: string, todoId: string) {
		let result = {
			statusCode: 200,
			body: ''
		}

		let todoToBeDeleted = await this.docClient
			.query({
				TableName: this.todosTable,
				KeyConditionExpression: 'userId = :userId AND todoId = :todoId',
				ExpressionAttributeValues: {
					':userId': userId,
					':todoId': todoId
				}
			})
			.promise()

		if (todoToBeDeleted.Items.length === 0) {
			result.statusCode = 404
			result.body = 'Nothing is deleted. The item is not found'
			return result
		}

		await this.docClient
			.delete({
				TableName: this.todosTable,
				Key: {
					userId,
					todoId
				}
			})
			.promise()

		await this.s3
			.deleteObject({
				Bucket: this.s3Bucket,
				Key: todoId
			})
			.promise()

		return result
	}

	async createTodo(todo: TodoItem): Promise<TodoItem> {
		await this.docClient
			.put({
				TableName: this.todosTable,
				Item: todo
			})
			.promise()

		return todo
	}

	async updateTodo(
		userId: string,
		todoId: string,
		parsedBody: UpdateTodoRequest
	) {
		let result = {
			statusCode: 200,
			body: ''
		}

		let todoToBeUpdate = await this.docClient
			.query({
				TableName: this.todosTable,
				KeyConditionExpression: 'userId = :userId AND todoId = :todoId',
				ExpressionAttributeValues: {
					':userId': userId,
					':todoId': todoId
				}
			})
			.promise()

		logger.info('Update in progress ..', todoToBeUpdate)

		if (todoToBeUpdate.Items.length === 0) {
			result = {
				statusCode: 404,
				body: 'Nothing is updated. The item is not found'
			}
			return result
		}

		if (!parsedBody.hasOwnProperty('done')) {
			await this.docClient
				.update({
					TableName: this.todosTable,
					Key: {
						userId,
						todoId
					},
					UpdateExpression: 'set #name =:name, #dueDate=:dueDate',
					ExpressionAttributeValues: {
						':name': parsedBody.name,
						':dueDate': parsedBody.dueDate
					},
					ExpressionAttributeNames: { '#name': 'name', '#dueDate': 'dueDate' },
					ReturnValues: 'UPDATED_NEW'
				})
				.promise()
		} else {
			await this.docClient
				.update({
					TableName: this.todosTable,
					Key: {
						userId,
						todoId
					},
					UpdateExpression: 'set #name =:name, #dueDate=:dueDate, #done=:done',
					ExpressionAttributeValues: {
						':name': parsedBody.name,
						':dueDate': parsedBody.dueDate,
						':done': parsedBody.done
					},
					ExpressionAttributeNames: {
						'#name': 'name',
						'#dueDate': 'dueDate',
						'#done': 'done'
					},
					ReturnValues: 'UPDATED_NEW'
				})
				.promise()
		}

		return result
	}

	async generateUploadUrl(userId, todoId) {
		let result = {
			statusCode: 201,
			body: ''
		}

		let checkIfExist = await this.docClient
			.query({
				TableName: this.todosTable,
				KeyConditionExpression: 'userId = :userId AND todoId = :todoId',
				ExpressionAttributeValues: {
					':userId': userId,
					':todoId': todoId
				}
			})
			.promise()

		if (checkIfExist.Items.length === 0) {
			result = {
				statusCode: 404,
				body: 'Error encountered. Nothing is uploaded.'
			}
			return result
		}

		await this.docClient
			.update({
				TableName: this.todosTable,
				Key: {
					userId,
					todoId
				},
				UpdateExpression: 'set #attachmentUrl =:attachmentUrl',
				ExpressionAttributeValues: {
					':attachmentUrl': `https://${this.s3Bucket}.s3.amazonaws.com/${todoId}`
				},
				ExpressionAttributeNames: { '#attachmentUrl': 'attachmentUrl' },
				ReturnValues: 'UPDATED_NEW'
			})
			.promise()

		result.body = this.s3.getSignedUrl('putObject', {
			Bucket: this.s3Bucket,
			Key: todoId,
			Expires: parseInt(this.urlExpiration)
		})

		return result
	}
}
function createDynamoDBClient(): AWS.DynamoDB.DocumentClient {
	if (process.env.IS_OFFLINE) {
		logger.info('Creating DynamoDB instance ...')
		return new XAWS.DynamoDB.DocumentClient({
			region: 'localhost',
			endpoint: 'http://localhost:8000'
		})
	}

	return new XAWS.DynamoDB.DocumentClient()
}
