import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SearchAutocompleteService } from '../services/search-autocomplete.service';
import { AutocompleteQueryDto } from '../dto/autocomplete-query.dto';

/**
 * Search Autocomplete Controller
 *
 * Provides autocomplete suggestions for search fields
 */
@Controller('api/projects/autocomplete')
@UseGuards(JwtAuthGuard)
export class SearchAutocompleteController {
  constructor(
    private readonly autocompleteService: SearchAutocompleteService,
  ) {}

  /**
   * Get autocomplete suggestions
   */
  @Get()
  async autocomplete(
    @Query() query: AutocompleteQueryDto,
    @Req() req: Request,
  ): Promise<any[]> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.autocompleteService.autocomplete(
      query.field,
      query.q,
      query.limit || 10,
      userId,
    );
  }
}