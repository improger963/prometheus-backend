import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

// ИЗМЕНЕННАЯ КОНФИГУРАЦИЯ:
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Используем URL из .env или дефолтный
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway инициализирован!');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Клиент подключен: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Клиент отключен: ${client.id}`);
  }

  @SubscribeMessage('joinProjectRoom')
  handleJoinRoom(client: Socket, projectId: string): void {
    client.join(projectId);
    this.logger.log(
      `Клиент ${client.id} присоединился к комнате проекта ${projectId}`,
    );
    client.emit(
      'joinedRoom',
      `Вы успешно присоединились к комнате проекта ${projectId}`,
    );
  }

  sendToProjectRoom(projectId: string, event: string, payload: any): void {
    this.server.to(projectId).emit(event, payload);
    this.logger.log(`Отправлено событие "${event}" в комнату ${projectId}`);
  }
}
