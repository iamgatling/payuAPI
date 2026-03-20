import knex, { Knex } from 'knex';

const dbClient = process.env.NODE_ENV === 'production' ? 'pg' : 'sqlite3';
const dbConnection = process.env.NODE_ENV === 'production' 
  ? process.env.DATABASE_URL 
  : { filename: './events.sqlite' };

export const db = knex({
  client: dbClient,
  connection: dbConnection,
  useNullAsDefault: true,
});

export async function initDb() {
  const exists = await db.schema.hasTable('events');
  if (!exists) {
    await db.schema.createTable('events', (table: Knex.TableBuilder) => {
      table.string('id').primary();
      table.string('source').notNullable();
      table.string('eventType').notNullable();
      table.string('reference').notNullable();
      table.string('status').notNullable();
      
      
      if (dbClient === 'pg') {
          table.jsonb('payload').notNullable();
      } else {
          table.text('payload').notNullable();
      }
      
      table.string('receivedAt').notNullable();
      table.string('updatedAt').notNullable();
    });
    console.log(' [DB] Initialized database table "events"');
  } else {
    console.log(' [DB] Connected to existing database');
  }

  const historyExists = await db.schema.hasTable('status_history');
  if (!historyExists) {
    await db.schema.createTable('status_history', (table: Knex.TableBuilder) => {
      table.increments('id').primary();
      table.string('event_id').notNullable();
      table.string('status').notNullable();
      table.string('timestamp').notNullable();
      
      table.foreign('event_id').references('events.id').onDelete('CASCADE');
    });
    console.log(' [DB] Initialized database table "status_history"');
  }
}
