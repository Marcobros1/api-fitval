import * as fs from 'node:fs/promises';
import { PhotosService } from './photos.service';

jest.mock('node:fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

// Un fichero como el que deja Multer. Solo nos interesan estos campos
function fileWith(mimetype: string, originalname = 'foto.png') {
  return {
    mimetype,
    originalname,
    buffer: Buffer.from('bytes'),
  } as Express.Multer.File;
}

describe('PhotosService', () => {
  let service: PhotosService;

  beforeEach(() => {
    service = new PhotosService();
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('guarda el fichero en uploads/ y devuelve su dirección pública', async () => {
    const url = await service.saveLocal(fileWith('image/png'));

    expect(mockedFs.mkdir).toHaveBeenCalledWith('uploads', { recursive: true });
    expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
    expect(url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
  });

  it('usa la extensión según el tipo real, no el nombre que manda el usuario', async () => {
    const url = await service.saveLocal(
      fileWith('image/jpeg', '../../main.js'),
    );

    expect(url).toMatch(/\.jpg$/);
    expect(url).not.toContain('main.js');
    expect(url).not.toContain('..');
  });

  it('genera un nombre distinto en cada subida', async () => {
    const first = await service.saveLocal(fileWith('image/png'));
    const second = await service.saveLocal(fileWith('image/png'));

    expect(first).not.toBe(second);
  });
});
