import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, CountryCode } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Green Valley Villas' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.VILLA })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiPropertyOptional({ enum: CountryCode, default: CountryCode.AE })
  @IsOptional()
  @IsEnum(CountryCode)
  countryCode?: CountryCode;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Dubai Marina' })
  @IsString()
  @MaxLength(100)
  area: string;

  @ApiProperty({ example: 'Villa 12, Green Valley, Dubai Marina' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 25.1972 })
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 55.2744 })
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'XXX-XXXX-XXXXX' })
  @IsOptional()
  @IsString()
  titleDeedNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plotNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dldPermitNo?: string;

  @ApiPropertyOptional({ example: 2020 })
  @IsOptional()
  @IsInt()
  @Min(1950) @Max(new Date().getFullYear() + 5)
  yearBuilt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 'AED' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  developerName?: string;
}
