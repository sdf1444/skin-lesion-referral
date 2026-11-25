import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ImageValidationPipe } from './image-validation.pipe';

const file = (buffer: Buffer, originalname = 'a.png') =>
  ({ buffer, originalname, size: buffer.length }) as Express.Multer.File;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(8),
]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

describe('ImageValidationPipe', () => {
  const pipe = new ImageValidationPipe();

  it('accepts PNG and JPEG by content', () => {
    expect(pipe.transform(file(png)).mimeType).toBe('image/png');
    expect(pipe.transform(file(jpeg, 'b.jpg')).mimeType).toBe('image/jpeg');
  });

  it('rejects a missing file', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('rejects non-image content regardless of filename', () => {
    expect(() =>
      pipe.transform(file(Buffer.from('<?php ?>'), 'evil.png')),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('strips path segments and unsafe characters from the filename', () => {
    expect(pipe.transform(file(png, '..\\..\\etc/pass<wd>.png')).filename).toBe(
      'pass_wd_.png',
    );
  });
});
