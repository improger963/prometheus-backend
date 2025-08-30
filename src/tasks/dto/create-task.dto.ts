import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Заголовок задачи не может быть пустым.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Описание задачи не может быть пустым.' })
  description: string;

  @IsMongoId({ message: 'ID агента должен быть валидным Mongo ID.' })
  @IsOptional() // Делаем поле опциональным на случай, если мы хотим создать задачу без немедленного назначения
  agentId?: string;
}
