// src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // companyId -> socketId

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.companyId = payload.companyId;
      
      this.connectedUsers.set(payload.companyId, client.id);
      client.join(`company_${payload.companyId}`);
      
      console.log(`Company ${payload.companyId} connected with socket ${client.id}`);
    } catch (error) {
      console.log('Invalid token, disconnecting client');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.companyId) {
      this.connectedUsers.delete(client.data.companyId);
      console.log(`Company ${client.data.companyId} disconnected`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const senderId = client.data.companyId;
      const message = await this.chatService.sendMessage(senderId, data);

      // Send to sender
      client.emit('message_sent', {
        success: true,
        data: message,
      });

      // Send to receiver if online
      const receiverSocketId = this.connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('new_message', {
          data: message,
        });
      }

      return { success: true, data: message };
    } catch (error) {
      client.emit('message_error', {
        success: false,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getConversationRoom(client.data.companyId, data.companyId);
    client.join(room);
    
    // Mark messages as read
    await this.chatService.markAsRead(client.data.companyId, data.companyId);
    
    return { success: true, room };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getConversationRoom(client.data.companyId, data.companyId);
    client.leave(room);
    
    return { success: true };
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const receiverSocketId = this.connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_typing', {
        companyId: client.data.companyId,
        typing: true,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const receiverSocketId = this.connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_typing', {
        companyId: client.data.companyId,
        typing: false,
      });
    }
  }

  private getConversationRoom(companyId1: string, companyId2: string): string {
    const sorted = [companyId1, companyId2].sort();
    return `conversation_${sorted[0]}_${sorted[1]}`;
  }

  // Method to send system notifications
  async sendNotificationToUser(companyId: string, notification: any) {
    const socketId = this.connectedUsers.get(companyId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }
}