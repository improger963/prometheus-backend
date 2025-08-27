import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Пожалуйста, введите корректный email.' })
  @IsNotEmpty({ message: 'Email не может быть пустым.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль не может быть пустым.' })
  password: string;
}
