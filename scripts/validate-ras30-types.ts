/*! Ad-hoc validation of generated ras30.jsonld against Entity.json/Property.json/Link.json
 * Run with: npx tsx scripts/validate-ras30-types.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

const ajv = new Ajv({ strict: false, allowUnionTypes: true });

const jsonldDir = path.resolve(__dirname, '..', 'packages', 'vue', 'public', 'assets', 'jsonld');
const entitySchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'Entity.json'), 'utf-8'));
const propertySchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'Property.json'), 'utf-8'));
const linkSchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'Link.json'), 'utf-8'));
const packageSchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'aPackage.json'), 'utf-8'));
const relationshipSchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'Relationship.json'), 'utf-8'));
const enumerationSchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'Enumeration.json'), 'utf-8'));
const anEntitySchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'anEntity.json'), 'utf-8'));
const aRelationshipSchema = JSON.parse(fs.readFileSync(path.join(jsonldDir, 'aRelationship.json'), 'utf-8'));

// Register the schemata referenced by aPackage.json so ajv can resolve them
ajv.addSchema(entitySchema);
ajv.addSchema(propertySchema);
ajv.addSchema(linkSchema);
ajv.addSchema(relationshipSchema);
ajv.addSchema(enumerationSchema);
ajv.addSchema(anEntitySchema);
ajv.addSchema(aRelationshipSchema);

const validateEntity = ajv.getSchema(entitySchema.$id)!;
const validateProperty = ajv.getSchema(propertySchema.$id)!;
const validateLink = ajv.getSchema(linkSchema.$id)!;
const validatePackage = ajv.compile(packageSchema);

const docPath = path.resolve(__dirname, '..', 'packages', 'common', 'ontology', 'ras30', 'ras30.cas.jsonld');
const doc = JSON.parse(fs.readFileSync(docPath, 'utf-8'));

let errors = 0;

if (!validatePackage(doc)) {
    errors++;
    console.error('INVALID package-level document:', validatePackage.errors);
}

for (const item of doc['@graph']) {
    const itemType = item['cas:itemType']?.['@id'];
    let validate;
    if (itemType === 'cas:Entity') validate = validateEntity;
    else if (itemType === 'cas:Property') validate = validateProperty;
    else if (itemType === 'cas:Link') validate = validateLink;
    else {
        console.error('Unknown itemType for', item['@id'], itemType);
        errors++;
        continue;
    }
    const ok = validate(item);
    if (!ok) {
        errors++;
        console.error(`INVALID ${item['@id']} (${itemType}):`, validate.errors);
    }
}

console.log(`Validated ${doc['@graph'].length} items, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
