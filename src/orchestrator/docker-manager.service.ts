import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import Docker, { Container } from 'dockerode';
import { Readable } from 'stream';

// Вводим кастомные типы ошибок для четкой идентификации
export class DockerConnectionError extends InternalServerErrorException {
  constructor() {
    super(
      'Не удалось подключиться к Docker Daemon. Убедитесь, что Docker запущен.',
    );
  }
}
export class ImagePullError extends InternalServerErrorException {
  constructor(imageName: string) {
    super(`Не удалось загрузить Docker-образ: ${imageName}.`);
  }
}

@Injectable()
export class DockerManagerService {
  private readonly logger = new Logger(DockerManagerService.name);
  private readonly docker: Docker;

  constructor() {
    try {
      this.docker = new Docker();
    } catch (error) {
      this.logger.error('Критическая ошибка инициализации Dockerode:', error);
      throw new DockerConnectionError();
    }
  }

  async createAndStartContainer(imageName: string): Promise<string> {
    try {
      await this.pullImage(imageName);
      const container: Container = await this.docker.createContainer({
        Image: imageName,
        Tty: true,
        Cmd: ['/bin/bash'],
        OpenStdin: true,
      });
      await container.start();
      return container.id;
    } catch (error) {
      this.logger.error(
        `Ошибка при создании контейнера из образа ${imageName}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Ошибка Docker при создании контейнера: ${error.message}`,
      );
    }
  }

  async executeCommand(
    containerId: string,
    command: string[],
  ): Promise<string> {
    const container = await this.getContainer(containerId);
    try {
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({ Tty: false, hijack: true });
      return this.streamToString(stream);
    } catch (error) {
      this.logger.error(
        `Ошибка выполнения команды в контейнере ${containerId}:`,
        error,
      );
      // Мы пробрасываем ошибку дальше, чтобы Оркестратор мог передать ее LLM
      throw new Error(
        `Команда "${command.join(' ')}" завершилась с ошибкой: ${error.message}`,
      );
    }
  }

  async stopAndRemoveContainer(containerId: string): Promise<void> {
    try {
      const container = await this.getContainer(containerId);
      await container.stop();
      await container.remove({ force: true });
    } catch (error) {
      // Игнорируем ошибки, если контейнер уже остановлен или удален, но логируем
      if (error.statusCode === 404 || error.statusCode === 304) {
        this.logger.warn(
          `Попытка остановить/удалить уже несуществующий контейнер ${containerId}.`,
        );
      } else {
        this.logger.error(
          `Ошибка при очистке контейнера ${containerId}:`,
          error,
        );
        throw new InternalServerErrorException(
          `Ошибка Docker при очистке контейнера: ${error.message}`,
        );
      }
    }
  }

  private async getContainer(containerId: string): Promise<Container> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.inspect();
      return container;
    } catch (error) {
      if (error.statusCode === 404) {
        throw new NotFoundException(
          `Контейнер с ID "${containerId}" не найден.`,
        );
      }
      throw new DockerConnectionError();
    }
  }

  private pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(new ImagePullError(imageName));
        this.docker.modem.followProgress(stream, (err) =>
          err ? reject(new ImagePullError(imageName)) : resolve(),
        );
      });
    });
  }

  private streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });
      stream.on('end', () => {
        resolve(data);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}
