/**
 * WebSocket JWT Guard
 * Authenticates WebSocket connections using JWT tokens
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user to client data
      client.data.user = payload;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromHandshake(client: Socket): string | undefined {
    // Check Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    // Check auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    return undefined;
  }
}
