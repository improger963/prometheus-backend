import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя агента не может быть пустым.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Роль агента не может быть пустой.' })
  role: string;

  @IsObject({ message: 'Матрица личности должна быть объектом.' })
  @IsNotEmpty({ message: 'Матрица личности не может быть пустой.' })
  personalityMatrix: Record<string, any>;
}