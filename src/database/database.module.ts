import { Module } from '@nestjs/common';
import { Pool } from 'pg';

// Crea el Pool y avisa (sin caerse) si PostgreSQL corta una conexión
function createPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Si PostgreSQL se para, cierra las conexiones que no se estaban usando.
  // Sin esta línea, ese aviso tumbaría la API entera.
  pool.on('error', (error) => console.error('PostgreSQL:', error.message));

  return pool;
}

@Module({
  providers: [
    {
      provide: Pool, // cuando alguien pida un Pool...
      useFactory: createPool, // ...NestJS ejecuta esta función una vez
    },
  ],
  exports: [Pool], // otros módulos pueden pedir el Pool
})
export class DatabaseModule {}
