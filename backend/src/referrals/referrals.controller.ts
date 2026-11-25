import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateReferralDto } from './dto/create-referral.dto';
import {
  ImageValidationPipe,
  MAX_IMAGE_BYTES,
  type ValidatedImage,
} from './image-validation.pipe';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  create(
    @Body() dto: CreateReferralDto,
    @UploadedFile(ImageValidationPipe) image: ValidatedImage,
  ) {
    return this.referrals.create(dto, image);
  }

  @Get()
  list(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.referrals.findRecent(limit && limit > 0 ? limit : undefined);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.referrals.findOne(id);
  }
}
