import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // Поле для назначения агента-исполнителя
  // ИМЯ ПРИВЕДЕНО В СООТВЕТСТВИЕ С СЕРВИСОМ
  @IsMongoId()
  @IsOptional()
  agentId?: string;
}
