import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { AgencyAuthGuard } from '../common/guards/agency-auth.guard';
import { AgencyOrAdminGuard } from '../common/guards/agency-or-admin.guard';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { SessionRole } from '../common/guards/session-role.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Controller('properties')
export class PropertyController {
  constructor(private readonly properties: PropertyService) {}

  @Post()
  @UseGuards(AgencyAuthGuard)
  async create(
    @CurrentSession() session: { id: string },
    @Body() dto: CreatePropertyDto,
  ) {
    return this.properties.create(session.id, dto);
  }

  @Get('mine')
  @UseGuards(AgencyAuthGuard)
  async findMine(@CurrentSession() session: { id: string }) {
    return this.properties.findMine(session.id);
  }

  @Patch('mine/:id')
  @UseGuards(AgencyAuthGuard)
  async updateMine(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.updateMine(session.id, id, dto);
  }

  @Post('mine/:id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgencyAuthGuard)
  async submitMine(
    @CurrentSession() session: { id: string },
    @Param('id') id: string,
  ) {
    return this.properties.submitMine(session.id, id);
  }

  @Get()
  async findPublicList() {
    return this.properties.findPublicList();
  }

  @Get(':id')
  async findPublicById(@Param('id') id: string) {
    return this.properties.findPublicById(id);
  }

  @Get(':id/full')
  @UseGuards(AgencyOrAdminGuard)
  async findFull(
    @CurrentSession() session: { id: string; role: SessionRole },
    @Param('id') id: string,
  ) {
    return this.properties.findFull(session, id);
  }
}
