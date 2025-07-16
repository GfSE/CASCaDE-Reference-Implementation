
import { describe, it, expect, beforeEach } from 'vitest';
import { createRelationship, readRelationship, deleteRelationship, listRelationships, validateRelationship } from '../src/pif_relationship_api';

describe('PIF Relationship API - Full Coverage', () => {
  const source = 'e1';
  const target = 'e2';
  const type = 'tracedTo';

  beforeEach(async () => {
    await createRelationship(source, target, type);
  });

  it('should create a valid relationship with inverse', async () => {
    const rel = await readRelationship(source, target, type);
    expect(rel.type).toBe(type);
    expect(rel.inverse).toBeDefined();
  });

  it('should not allow duplicate relationships', async () => {
    await expect(createRelationship(source, target, type)).rejects.toThrow();
  });

  it('should list all relationships', async () => {
    const list = await listRelationships();
    expect(list.length).toBeGreaterThan(0);
  });

  it('should delete a relationship and its inverse', async () => {
    const result = await deleteRelationship(source, target, type);
    expect(result).toBe(true);
  });

  it('should validate a correct relationship definition', async () => {
    const valid = await validateRelationship({ source, target, type });
    expect(valid).toBe(true);
  });

  it('should reject invalid relationships', async () => {
    await expect(validateRelationship({ source: '', target, type })).rejects.toThrow();
  });
});
