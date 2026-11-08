// Run from the FE checkout. Defaults to a read-only preview.
// node scripts/repair-sync-validators.mjs <backend-directory> [--apply]
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const backend = resolve(process.argv[2]);
process.loadEnvFile(join(backend, '.env'));
const requireBackend = createRequire(join(backend, 'package.json'));
const mongoose = requireBackend('mongoose');
const connection = await mongoose.createConnection(
  process.env.MONGODB_URI || process.env.connection_string,
  { autoIndex: false, serverSelectionTimeoutMS: 10000 },
).asPromise();
const temporary = [];
try {
  assert.equal(connection.name, 'hoiquy3d', 'Only the approved hoiquy3d database may be repaired.');
  const plans = [];
  for (const name of ['experiments', 'syncOperations']) {
    const [info] = await connection.db.listCollections({ name }).toArray();
    assert(info, `Missing collection: ${name}`);
    const validator = structuredClone(info.options.validator);
    const schema = validator?.$jsonSchema;
    assert(schema?.properties?.status?.enum, `Unrecognized validator: ${name}`);
    const statuses = name === 'experiments'
      ? ['draft', 'ready', 'running', 'completed', 'error']
      : ['applied', 'conflict', 'rejected', 'duplicate', 'error'];
    schema.properties.status.enum = [...new Set([...schema.properties.status.enum, ...statuses])];
    if (name === 'syncOperations') {
      // Retain legacy documents while accepting the current backend's action field.
      if (schema.required.includes('operation')) {
        schema.required = schema.required.filter(field => field !== 'operation');
        schema.allOf = [...(schema.allOf ?? []), {
          anyOf: [{ required: ['operation'] }, { required: ['action'] }],
        }];
      }
      schema.properties.action = { enum: ['create', 'update', 'delete'] };
    }
    const indexes = await connection.db.collection(name).indexes();
    plans.push({ name, before: info.options, validator, indexes });
  }
  console.log(JSON.stringify(plans.map(({ name, before, validator }) => ({
    name, changed: JSON.stringify(before.validator) !== JSON.stringify(validator), validator,
  })), null, 2));
  if (process.argv.includes('--apply')) {
    const folder = resolve('output/playwright');
    mkdirSync(folder, { recursive: true });
    const backup = join(folder, `sync-validators-${Date.now()}.json`);
    writeFileSync(backup, JSON.stringify({ database: connection.name, plans }, null, 2), { flag: 'wx' });
    console.log(`Backup: ${backup}`);

    // Exercise the actual backend service and Mongoose schemas against temporary
    // collections carrying the exact DB validators. No user documents are touched.
    const load = path => import(pathToFileURL(join(backend, 'dist', path)).href);
    const { ExperimentSchema } = await load('experiments/schemas/experiment.schema.js');
    const { SyncOperationSchema } = await load('sync/schemas/sync-operation.schema.js');
    const { SyncService } = await load('sync/sync.service.js');
    const suffix = randomUUID().replaceAll('-', '');
    const models = [];
    for (const [i, schema] of [ExperimentSchema, SyncOperationSchema].entries()) {
      const collection = `sync_validator_check_${suffix}_${i}`;
      await connection.db.createCollection(collection, { validator: plans[i].before.validator });
      temporary.push(collection);
      models.push(connection.model(`ValidatorCheck${i}`, schema, collection));
    }
    const [experiments, operations] = models;
    const service = new SyncService(operations, experiments, null, null);
    const user = { userId: `validator-check-${suffix}`, role: 'user' };
    const id = randomUUID();
    const operation = {
      operationId: randomUUID(), idempotencyKey: randomUUID(), entityType: 'experiment',
      entityClientId: id, action: 'create', clientVersion: 0,
      payload: { name: 'Validator compatibility check', status: 'completed',
        algorithm: { type: 'linear', version: '1.0.0', config: { snapshot: { w: [1, 2], b: 0 } } } },
    };
    const before = await service.processBatch({ operations: [operation] }, user);
    console.log(`Before repair: ${before.results[0].status} (${before.results[0].error ?? 'already compatible'})`);
    // Reset only the two newly created, uniquely named test collections.
    for (const name of temporary) await connection.db.collection(name).deleteMany({});
    for (const [i, name] of temporary.entries()) {
      await connection.db.command({ collMod: name, validator: plans[i].validator });
    }
    const created = await service.processBatch({ operations: [operation] }, user);
    assert.equal(created.results[0].status, 'applied', JSON.stringify(created));
    assert.deepEqual((await experiments.findOne({ clientId: id }).lean()).algorithm.config.snapshot.w, [1, 2]);
    assert.equal((await service.processBatch({ operations: [operation] }, user)).results[0].status, 'duplicate');
    const deletion = { ...operation, action: 'delete', clientVersion: 1,
      operationId: randomUUID(), idempotencyKey: randomUUID(), payload: {} };
    assert.equal((await service.processBatch({ operations: [deletion] }, user)).results[0].status, 'applied');
    assert((await experiments.findOne({ clientId: id }).lean()).deletedAt);
    // Validation must remain active for unsupported values.
    await assert.rejects(experiments.collection.insertOne({ clientId: randomUUID(), name: 'Invalid',
      algorithm: { type: 'linear' }, status: 'not-a-status' }), error => error.code === 121);
    await assert.rejects(operations.collection.insertOne({ operationId: randomUUID(),
      entityType: 'experiment', entityClientId: id, status: 'applied' }), error => error.code === 121);
    console.log('Verified: create, snapshot readback, duplicate retry, delete, invalid data rejected.');

    for (const plan of plans) {
      const [current] = await connection.db.listCollections({ name: plan.name }).toArray();
      assert.deepEqual(current.options, plan.before, 'Validator changed concurrently; rerun preview.');
    }
    for (const plan of plans) {
      await connection.db.command({ collMod: plan.name, validator: plan.validator });
      const [current] = await connection.db.listCollections({ name: plan.name }).toArray();
      assert.deepEqual(current.options.validator, plan.validator);
      assert.deepEqual(await connection.db.collection(plan.name).indexes(), plan.indexes);
    }
    console.log('Applied and verified both validators. Existing documents and indexes are unchanged.');
  }
} finally {
  for (const name of temporary) {
    assert(name.startsWith('sync_validator_check_'));
    await connection.db.dropCollection(name);
  }
  await connection.close();
}
