import { Controller, Post, Body, HttpCode, HttpStatus, Version } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @ApiOperation({ 
    summary: 'Register a new user account',
    description: 'Creates a new user account with email and password. Returns a JWT token for immediate authentication.' 
  })
  @ApiBody({ 
    type: SignUpDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Standard signup',
        value: {
          email: 'user@example.com',
          password: 'SecurePass123!'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        token: { type: 'string', description: 'JWT authentication token' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation errors or invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ],
          example: ['Email must be a valid email address', 'Password must be at least 8 characters long']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiConflictResponse({ 
    description: 'Email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' }
      }
    }
  })
  signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
    return this.authService.signUp(signUpDto);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Authenticate user and receive JWT token',
    description: 'Authenticates a user with email and password, returning a JWT token for API access.' 
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      example1: {
        summary: 'Standard login',
        value: {
          email: 'user@example.com',
          password: 'SecurePass123!'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' }
          }
        },
        token: { type: 'string', description: 'JWT authentication token' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array',
          items: { type: 'string' },
          example: ['Email must be a valid email address', 'Password cannot be empty']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' }
      }
    }
  })
  login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
    return this.authService.login(loginDto);
  }
}
