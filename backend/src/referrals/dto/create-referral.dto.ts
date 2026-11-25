import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Multipart fields arrive as strings, so booleans need explicit parsing.
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false' || value === undefined
      ? false
      : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReferralDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  patientName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(0)
  @Max(120)
  patientAge!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  site!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  referrerName!: string;

  @Transform(toBool) @IsBoolean() asymmetry: boolean = false;
  @Transform(toBool) @IsBoolean() borderIrregular: boolean = false;
  @Transform(toBool) @IsBoolean() colourVariation: boolean = false;
  @Transform(toBool) @IsBoolean() diameterOver6mm: boolean = false;
  @Transform(toBool) @IsBoolean() evolving: boolean = false;
  @Transform(toBool) @IsBoolean() bleedingOrUlcerated: boolean = false;
  @Transform(toBool) @IsBoolean() familyHistoryMelanoma: boolean = false;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
