import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// La extensión sale del tipo de archivo, nunca del nombre que manda el usuario
const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const UPLOADS_DIR = 'uploads';

@Injectable()
export class PhotosService {
  // Guarda la foto en uploads/ con un nombre nuevo y único, y devuelve su dirección
  async saveLocal(file: Express.Multer.File): Promise<string> {
    const fileName = randomUUID() + EXTENSIONS[file.mimetype];
    await mkdir(UPLOADS_DIR, { recursive: true }); // crea la carpeta si no existe
    await writeFile(join(UPLOADS_DIR, fileName), file.buffer);
    return `/${UPLOADS_DIR}/${fileName}`;
  }
}
