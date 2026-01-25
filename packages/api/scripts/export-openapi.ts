#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { createSwaggerSpec } from '../src/swagger/schema.js';

const spec = createSwaggerSpec('');
writeFileSync('./openapi.json', JSON.stringify(spec, null, 2));
console.log('✅ OpenAPI spec exported');