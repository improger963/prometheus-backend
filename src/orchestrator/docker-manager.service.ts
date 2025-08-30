import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
// ИСПРАВЛЕННЫЙ ИМПОРТ:
import Docker, { Container } from 'dockerode';
import { Readable } from 'stream';

@Injectable()
export class DockerManagerService {
  private readonly docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Создает и запускает новый Docker-контейнер из указанного образа.
   * @param imageName - Имя образа, например, 'ubuntu:latest'.
   * @returns ID созданного контейнера.
   */
  async createAndStartContainer(imageName: string): Promise<string> {
    try {
      await this.pullImage(imageName);

      const container: Container = await this.docker.createContainer({
        Image: imageName,
        Tty: true,
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: true,
      });

      await container.start();
      return container.id;
    } catch (error) {
      console.error('Ошибка при создании контейнера:', error);
      throw new InternalServerErrorException(
        'Не удалось создать Docker-контейнер.',
      );
    }
  }

  /**
   * Выполняет команду внутри запущенного контейнера.
   * @param containerId - ID контейнера.
   * @param command - Массив строк команды, например, ['ls', '-la'].
   * @returns Результат выполнения команды (stdout).
   */
  async executeCommand(
    containerId: string,
    command: string[],
  ): Promise<string> {
    const container = await this.getContainer(containerId);

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Tty: false, hijack: true });

    // В dockerode v3+ стандартный demuxStream больше не требуется в том виде, как раньше.
    // Простой сбор данных из потока работает для большинства случаев.
    return new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', (chunk) => (output += chunk.toString('utf8')));
      stream.on('end', () => resolve(output));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Останавливает и удаляет контейнер.
   * @param containerId - ID контейнера.
   */
  async stopAndRemoveContainer(containerId: string): Promise<void> {
    const container = await this.getContainer(containerId);
    try {
      await container.stop();
      await container.remove({ force: true });
    } catch (error) {
      if (error.statusCode !== 304 && error.statusCode !== 404) {
        throw new InternalServerErrorException(
          `Не удалось остановить или удалить контейнер: ${error.message}`,
        );
      }
      // Если контейнер уже был остановлен (304) или не найден (404), просто пытаемся удалить
      if (error.statusCode !== 404) {
        await container.remove({ force: true });
      }
    }
  }

  // --- Вспомогательные приватные методы ---

  private async getContainer(containerId: string): Promise<Container> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.inspect();
      return container;
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundException(
          `Контейнер с ID "${containerId}" не найден.`,
        );
      }
      throw error;
    }
  }

  private pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);
        this.docker.modem.followProgress(stream, (err) =>
          err ? reject(err) : resolve(),
        );
      });
    });
  }
}
