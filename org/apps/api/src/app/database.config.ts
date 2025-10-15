import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as entities from './entities';
import * as fs from 'fs';
import * as path from 'path';

export const createDataSource = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const dbPath = configService.get('DB_PATH') || 'data/stms.db';
  // Ensure the parent directory exists to avoid SQLite open errors
  const resolvedDbDir = path.resolve(process.cwd(), path.dirname(dbPath));
  try {
    if (!fs.existsSync(resolvedDbDir)) {
      fs.mkdirSync(resolvedDbDir, { recursive: true });
    }
  } catch {
    // best-effort; if it fails, sqlite will surface an error which we can see in logs
  }
  
  return new DataSource({
    type: 'sqlite',
    database: dbPath,
    entities: Object.values(entities),
    synchronize: !isProduction, // Auto-sync in development only
    logging: !isProduction,
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsRun: false, // We'll run migrations manually
  });
};