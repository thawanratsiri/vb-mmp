import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'typesense';
import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export interface EquipmentDocument {
  id: string;
  equipment: string;
  site: string;
}

@Injectable()
export class TypesenseService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(TypesenseService.name);

  constructor() {
    this.client = new Client({
      nodes: [
        {
          host: '10.249.111.59',
          port: 8108,
          protocol: 'http',
        },
      ],
      apiKey: 'SuperSecretKey123',
      connectionTimeoutSeconds: 2,
    });
  }

  async onModuleInit() {
    await this.initSchema();
  }

  private async initSchema() {
    const schema: CollectionCreateSchema = {
      name: 'equipment',
      fields: [
        { name: 'id', type: 'string' }, 
        { name: 'equipment', type: 'string' },
        { name: 'site', type: 'string', facet: true }, 
      ],
    };

    try {
      await this.client.collections('equipment').retrieve();
      this.logger.log('Typesense collection "equipment" is ready.');
    } catch (error) {
      this.logger.log('Creating Typesense collection "equipment"...');
      await this.client.collections().create(schema);
    }
  }

  async upsertEquipment(data: { id: number; equipment: string; site: string }) {
    try {
      await this.client.collections<EquipmentDocument>('equipment').documents().upsert({
        id: data.id.toString(),
        equipment: data.equipment,
        site: data.site,
      });
    } catch (error) {
      this.logger.error('Error upserting to Typesense', error);
    }
  }

  async searchEquipment(searchQuery: string, site?: string) {
    const searchParameters: any = {
      q: searchQuery,
      query_by: 'equipment',
      per_page: 20,
    };

    if (site && site !== 'all') {
      searchParameters.filter_by = `site:=${site}`;
    }

    const searchResults = await this.client
      .collections<EquipmentDocument>('equipment')
      .documents()
      .search(searchParameters);
    
    return searchResults.hits?.map(hit => hit.document.id) || [];
  }
}