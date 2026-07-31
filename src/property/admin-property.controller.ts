import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AdminPropertiesQueryDto } from './dto/admin-properties-query.dto';
import { RejectPropertyDto } from './dto/reject-property.dto';

@Controller('admin/properties')
@UseGuards(AdminAuthGuard)
export class AdminPropertyController {
  constructor(private readonly properties: PropertyService) {}

  @Get()
  async findAll(@Query() query: AdminPropertiesQueryDto) {
    return this.properties.findAllForAdmin(query.status);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
  ) {
    return this.properties.approve(session.id, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
    @Body() dto: RejectPropertyDto,
  ) {
    return this.properties.reject(session.id, id, dto);
  }
}
