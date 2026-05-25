import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+971501234567',
    description: 'Phone number in E.164 format (+971 UAE, +91 India)',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be in E.164 format (e.g. +971501234567)' })
  phone: string;
}
