import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // --- ИЗМЕНЕНИЕ ---
  @IsUUID() // Используем валидатор для UUID вместо MongoId
  @IsOptional()
  agentId?: string;
  // -----------------
}
