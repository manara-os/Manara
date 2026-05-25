import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Files')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to document vault' })
  async uploadFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { entityType: string; entityId: string },
  ) {
    const url = await this.filesService.upload(
      file,
      user.workspaceId,
      body.entityType,
      body.entityId,
    );
    return { url, filename: file.originalname, size: file.size, mimetype: file.mimetype };
  }

  @Get('presigned-upload')
  @ApiOperation({ summary: 'Get presigned URL for direct S3 upload' })
  async getPresignedUpload(
    @CurrentUser() user: any,
    @Query('entityType') entityType: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    return this.filesService.getPresignedUploadUrl(
      user.workspaceId,
      entityType,
      fileName,
      contentType,
    );
  }
}
