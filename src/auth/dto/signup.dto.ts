import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'Пожалуйста, введите корректный email.' })
  @IsNotEmpty({ message: 'Email не может быть пустым.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль не может быть пустым.' })
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов.' })
  password: string;
}
