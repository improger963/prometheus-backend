import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Заголовок задачи не может быть пустым.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Описание задачи не может быть пустым.' })
  description: string;
}
