import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrainersService } from './trainers.service';
import { PhotosService } from './photos.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';

// Reglas de la foto: como mucho 2 MB y solo PNG, JPG o WEBP. Si no, 400
const photoPipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({
      maxSize: 2 * 1024 * 1024, // 2 MB en bytes
      message: 'La imagen no puede pasar de 2 MB',
    }),
    new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
  ],
});

@Controller('trainers') // rutas /api/v1/trainers
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly photosService: PhotosService,
  ) {}

  @Get(':id') // GET /api/v1/trainers/1 (sin guard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainersService.findOne(id);
  }

  @Post() // POST /api/v1/trainers (solo staff)
  @UseGuards(AuthGuard, StaffGuard)
  create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }

  // POST /api/v1/trainers/1/photo (solo staff). El campo del formulario se llama "photo"
  @Post(':id/photo')
  @UseGuards(AuthGuard, StaffGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(photoPipe) file: Express.Multer.File,
  ) {
    await this.trainersService.findOne(id); // 404 si el monitor no existe, antes de guardar nada
    const photoUrl = await this.photosService.saveLocal(file);
    return this.trainersService.setPhoto(id, photoUrl);
  }
}
