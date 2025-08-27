import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    // Подключаем Passport.js со стратегией 'jwt' по умолчанию
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Асинхронно настраиваем JWT модуль, чтобы он мог прочитать секрет из .env
    JwtModule.registerAsync({
      imports: [ConfigModule], // Импортируем ConfigModule, чтобы получить доступ к ConfigService
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_SECRET'), // Получаем секретный ключ
          signOptions: {
            expiresIn: '1d', // Устанавливаем срок жизни токена
          },
        };
      },
    }),

    // Подключаем Mongoose и регистрируем схему User
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController], // Регистрируем наш контроллер
  providers: [AuthService], // Регистрируем наш сервис
})
export class AuthModule {}
