//  The business logic of an application that works with the data layer. 
import { TodoItem } from '../models/TodoItem'
import { DataLayerAccess } from '../dataLayer/groupsAccess'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import { parseUserId } from '../auth/utils'
import { createLogger } from '../utils/logger'
import * as uuid from 'uuid'

const logger = createLogger('todos')

// All DynamoDB access codes are kept in the dataLayer: DataLayerAccess
const dataLayerAccess = new DataLayerAccess()

export async function getTodos(jwtToken: string): Promise<TodoItem[]> {
	const userId = parseUserId(jwtToken)

	return dataLayerAccess.getTodos(userId)
}

export async function deleteTodo(jwtToken: string, todoId: string) {
	const userId = parseUserId(jwtToken)
	const toReturn = dataLayerAccess.deleteItem(userId, todoId)

	return toReturn
}

export async function createTodo(
	jwtToken: string,
	parsedBody: CreateTodoRequest
) {
	const userId = parseUserId(jwtToken)
	const todoId = uuid.v4()

	logger.info('userId', userId)
	logger.info('todoId', todoId)

	const item = {
		userId,
		todoId,
		createdAt: new Date().toISOString(),
		done: false,
		...parsedBody,
		attachmentUrl: ''
	}

	logger.info('Creating item with business logic', item)
	const toReturn = dataLayerAccess.createTodo(item)

	return toReturn
}

export async function updatedTodo(
	jwtToken: string,
	todoId: string,
	parsedBody: UpdateTodoRequest
) {
	const userId = parseUserId(jwtToken)
	const result = dataLayerAccess.updateTodo(userId, todoId, parsedBody)

	return result
}

export async function generateUploadUrl(jwtToken: string, todoId: string) {
	const userId = parseUserId(jwtToken)
	const result = dataLayerAccess.generateUploadUrl(userId, todoId)

	return result
}
