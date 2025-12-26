/**
 * AI Streaming Gateway
 * WebSocket gateway for real-time AI response streaming
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { AiService } from '../services/ai.service';
import { AiOperationType } from '../constants/ai-config.constants';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

interface StreamingRequest {
  operationType: AiOperationType;
  projectId: string;
  userId: string;
  variables: Record<string, any>;
  useCache?: boolean;
  model?: string;
  temperature?: number;
}

@WebSocketGateway({
  namespace: 'ai',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AiStreamingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiStreamingGateway.name);
  private activeConnections = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(private aiService: AiService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from active connections
    for (const [userId, sockets] of this.activeConnections.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeConnections.delete(userId);
      }
    }
  }

  /**
   * Register a user's socket connection
   */
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, new Set());
    }

    this.activeConnections.get(userId)!.add(client.id);

    this.logger.log(`User ${userId} registered with socket ${client.id}`);

    client.emit('registered', { success: true, socketId: client.id });
  }

  /**
   * Stream AI operation response
   * Emits chunks as they're generated
   */
  @SubscribeMessage('streamOperation')
  @UseGuards(WsJwtGuard)
  async handleStreamOperation(
    @MessageBody() request: StreamingRequest,
    @ConnectedSocket() client: Socket,
  ) {
    const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `Starting streaming operation ${operationId}: ${request.operationType}`,
    );

    try {
      // Emit start event
      client.emit('operationStart', {
        operationId,
        operationType: request.operationType,
        timestamp: new Date().toISOString(),
      });

      // For now, we'll execute the operation normally
      // In a real streaming implementation, you'd need OpenAI SDK's streaming API
      const response = await this.aiService.executeOperation(
        {
          projectId: request.projectId,
          userId: request.userId,
          operationType: request.operationType,
          useCache: request.useCache,
          model: request.model as any,
          temperature: request.temperature,
        },
        request.variables,
      );

      // Simulate streaming by chunking the response
      // In production, this would stream tokens as they arrive from OpenAI
      const resultString = JSON.stringify(response.result);
      const chunkSize = 100;

      for (let i = 0; i < resultString.length; i += chunkSize) {
        const chunk = resultString.slice(i, i + chunkSize);

        client.emit('operationChunk', {
          operationId,
          chunk,
          progress: Math.min(100, ((i + chunkSize) / resultString.length) * 100),
        });

        // Small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Emit completion
      client.emit('operationComplete', {
        operationId,
        result: response.result,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        responseTime: response.responseTime,
        cached: response.cached,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Streaming operation ${operationId} completed successfully`);
    } catch (error: any) {
      this.logger.error(
        `Streaming operation ${operationId} failed: ${error.message}`,
        error.stack,
      );

      client.emit('operationError', {
        operationId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cancel a streaming operation
   */
  @SubscribeMessage('cancelOperation')
  handleCancelOperation(
    @MessageBody() data: { operationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Operation ${data.operationId} cancelled by client ${client.id}`);

    // In a real implementation, you'd track and cancel the ongoing AI request
    client.emit('operationCancelled', {
      operationId: data.operationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get active operations for a user
   */
  @SubscribeMessage('getActiveOperations')
  handleGetActiveOperations(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // In a real implementation, you'd track active operations
    // For now, return empty array
    client.emit('activeOperations', {
      operations: [],
    });
  }

  /**
   * Broadcast AI alert to all connected clients for a project
   */
  async broadcastProjectAlert(
    projectId: string,
    alert: {
      type: string;
      severity: string;
      title: string;
      description: string;
    },
  ) {
    this.server.to(`project:${projectId}`).emit('projectAlert', {
      projectId,
      alert,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted alert to project ${projectId}: ${alert.title}`);
  }

  /**
   * Broadcast AI insights update
   */
  async broadcastInsightsUpdate(
    projectId: string,
    insights: {
      healthScore?: number;
      riskCount?: number;
      anomalyCount?: number;
    },
  ) {
    this.server.to(`project:${projectId}`).emit('insightsUpdate', {
      projectId,
      insights,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Join project room for broadcasts
   */
  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} joined project ${data.projectId}`);

    client.emit('projectJoined', {
      projectId: data.projectId,
      success: true,
    });
  }

  /**
   * Leave project room
   */
  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} left project ${data.projectId}`);

    client.emit('projectLeft', {
      projectId: data.projectId,
      success: true,
    });
  }
}
