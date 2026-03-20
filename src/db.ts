import knex, { Knex } from 'knex';

const dbClient = process.env.NODE_ENV === 'production' ? 'pg' : 'sqlite3';
const dbConnection = process.env.NODE_ENV === 'production' 
  ? process.env.DATABASE_URL 
  : { filename: './payments.sqlite' };

export const db = knex({
  client: dbClient,
  connection: dbConnection,
  useNullAsDefault: true,
});

export async function initDb() {
  const exists = await db.schema.hasTable('payments');
  if (!exists) {
    await db.schema.createTable('payments', (table: Knex.TableBuilder) => {
      table.string('payment_id').primary();
      table.decimal('amount', 14, 2).notNullable();
      table.string('status').notNullable();
      table.string('user').notNullable();
      table.string('receivedAt').notNullable();
      table.string('updatedAt').notNullable();
    });
    console.log(' [DB] Initialized database table "payments"');
  } else {
    console.log(' [DB] Connected to existing databse');
  }

  const historyExists = await db.schema.hasTable('status_history');
  if (!historyExists) {
    await db.schema.createTable('status_history', (table: Knex.TableBuilder) => {
      table.increments('id').primary();
      table.string('payment_id').notNullable();
      table.string('status').notNullable();
      table.string('timestamp').notNullable();
      
      table.foreign('payment_id').references('payments.payment_id').onDelete('CASCADE');
    });
    console.log(' [DB] Initialized database table "status_history"');
  }
}
