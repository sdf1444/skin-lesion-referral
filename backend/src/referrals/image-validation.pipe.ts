import {
  Injectable,
  PipeTransform,
  UnsupportedMediaTypeException,
  BadRequestException,
} from '@nestjs/common';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageType(
  buf: Buffer,
): 'image/jpeg' | 'image/png' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (buf.length > PNG.length && buf.subarray(0, PNG.length).equals(PNG))
    return 'image/png';
  return null;
}

export interface ValidatedImage {
  buffer: Buffer;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png';
  bytes: number;
}

/** Validates by magic bytes; the client-supplied mimetype is not trusted. */
@Injectable()
export class ImageValidationPipe implements PipeTransform<
  Express.Multer.File | undefined,
  ValidatedImage
> {
  transform(file: Express.Multer.File | undefined): ValidatedImage {
    if (!file)
      throw new BadRequestException("Lesion image is required (field 'image')");
    const mimeType = detectImageType(file.buffer);
    if (!mimeType)
      throw new UnsupportedMediaTypeException(
        'Only JPEG or PNG images are supported',
      );
    const filename =
      file.originalname
        .replace(/^.*[\\/]/, '')
        .replace(/[^\w.\- ]/g, '_')
        .slice(0, 100) || 'image';
    return { buffer: file.buffer, filename, mimeType, bytes: file.size };
  }
}
