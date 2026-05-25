import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PushTokenData {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  expoPushToken: string;
}

export class RegisterPushTokenDto {
  @ApiProperty({ type: PushTokenData })
  @IsObject()
  @ValidateNested()
  @Type(() => PushTokenData)
  data: PushTokenData;

  @ApiProperty({ example: 'owner', enum: ['owner', 'tenant', 'vendor'], required: false })
  @IsOptional()
  @IsString()
  appVariant?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
