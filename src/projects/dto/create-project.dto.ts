import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Название проекта не может быть пустым.' })
  name: string;

  @IsUrl({}, { message: 'Пожалуйста, укажите корректный URL git-репозитория.' })
  @IsNotEmpty({ message: 'URL git-репозитория не может быть пустым.' })
  gitRepositoryURL: string;
  @IsString()
  @IsOptional() // Делаем его опциональным, так как у нас есть значение по умолчанию
  baseDockerImage?: string;
}
