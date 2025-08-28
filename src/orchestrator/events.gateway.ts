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

// @WebSocketGateway() - основной декоратор, который делает класс шлюзом WebSocket.
// Мы можем указать порт и другие опции, но для начала оставим настройки по умолчанию.
@WebSocketGateway({
  cors: {
    origin: '*', // В продакшене здесь должен быть URL вашего фронтенда
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  // @WebSocketServer() инжектирует экземпляр нативного сервера socket.io
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

  /**
   * Слушает событие 'joinProjectRoom' от клиента.
   * Клиент должен отправить это событие с ID проекта, чтобы начать получать обновления.
   * @param client - Сокет подключенного клиента.
   * @param projectId - ID проекта (комнаты), к которому нужно присоединиться.
   */
  @SubscribeMessage('joinProjectRoom')
  handleJoinRoom(client: Socket, projectId: string): void {
    client.join(projectId);
    this.logger.log(
      `Клиент ${client.id} присоединился к комнате проекта ${projectId}`,
    );
    // Можно отправить подтверждение обратно клиенту
    client.emit(
      'joinedRoom',
      `Вы успешно присоединились к комнате проекта ${projectId}`,
    );
  }

  /**
   * Публичный метод для отправки сообщений в комнату проекта.
   * Этот метод будут вызывать другие сервисы нашего бэкенда.
   * @param projectId - ID комнаты (проекта).
   * @param event - Название события (например, 'agentLog', 'taskStatusUpdate').
   * @param payload - Данные, которые нужно отправить.
   */
  sendToProjectRoom(projectId: string, event: string, payload: any): void {
    this.server.to(projectId).emit(event, payload);
    this.logger.log(`Отправлено событие "${event}" в комнату ${projectId}`);
  }
}
