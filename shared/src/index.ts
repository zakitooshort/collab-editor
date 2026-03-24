export type { NodeId, InsertOp, DeleteOp, Op } from './operations'
export { nodeIdKey, nodeIdEqual, compareNodeIds } from './operations'
export { RGADocument } from './crdt'

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface Document {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  ownerId: string
  owner?: Pick<User, 'id' | 'name' | 'email'>
}

export type Role = 'EDITOR' | 'VIEWER'

export interface Collaborator {
  userId: string
  documentId: string
  role: Role
  user?: Pick<User, 'id' | 'name' | 'email'>
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}
