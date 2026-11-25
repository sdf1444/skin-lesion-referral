import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../users/roles';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListReferralsQuery } from './dto/list-referrals.query';
import {
  ImageValidationPipe,
  MAX_IMAGE_BYTES,
  type ValidatedImage,
} from './image-validation.pipe';
import { ReferralsService, type ReferralView } from './referrals.service';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Post()
  @Roles('referrer', 'admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async create(
    @Body() dto: CreateReferralDto,
    @UploadedFile(ImageValidationPipe) image: ValidatedImage,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReferralView> {
    if (!key || !IDEMPOTENCY_KEY.test(key)) {
      throw new BadRequestException(
        'Idempotency-Key header is required (8-64 chars: letters, digits, _ or -)',
      );
    }
    const { referral, created } = await this.referrals.create(
      dto,
      image,
      user,
      key,
    );
    res.status(created ? 201 : 200);
    return this.referrals.toView(referral, user);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListReferralsQuery,
  ): Promise<ReferralView[]> {
    const rows = await this.referrals.findAll(user, query);
    return rows.map((r) => this.referrals.toView(r, user));
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralView> {
    return this.referrals.toView(await this.referrals.findOne(id, user), user);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralView> {
    return this.referrals.toView(
      await this.referrals.transition(id, dto.status, user),
      user,
    );
  }
}
