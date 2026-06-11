/*!
 * FMI Import Tests
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */

import { FmiImporter } from '../../src/common/import/fmi/import-fmi';
import * as path from 'path';
import * as fs from 'fs';
import { PigItemType } from '../../src/common/schema/pig/ts/pig-metaclasses';

function findFmuFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            findFmuFiles(filePath, fileList);
        } else if (file.endsWith('.fmu')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

/** Helper: first title/value of an instantiated item. */
function titleOf(item: any): string {
    const t = item?.title;
    if (Array.isArray(t)) return t[0]?.value ?? '';
    return typeof t === 'string' ? t : (t?.value ?? '');
}

/** Helper: value of a configurable property by its class id. */
function propValue(item: any, classId: string): string | undefined {
    const props = item?.hasProperty;
    if (!Array.isArray(props)) return undefined;
    const p = props.find((x: any) => x?.hasClass === classId);
    return p?.value;
}

describe('FMI Import', () => {
    const testFilesDir = path.resolve(__dirname, '../data/FMI');
    const fmuFiles: string[] = findFmuFiles(testFilesDir);
    // The plant model is the richest reference model (FMI 2.0, CoSimulation).
    const plantFmu = fmuFiles.find(f => f.endsWith('plant_Euler_0_001.fmu'));
    const plantXml = path.resolve(testFilesDir, 'plant_Euler_0_001.modelDescription.xml');

    const logResponse = (context: string, response: any) => {
        if (!response.ok) {
            process.stderr.write(`\n❌ ${context} FAILED:\n${JSON.stringify(response, null, 2)}\n`);
        }
    };

    beforeAll(() => {
        let str = `Found ${fmuFiles.length} FMU test files:`;
        fmuFiles.forEach(f => str += `\n  - ${path.relative(testFilesDir, f)}`);
        console.log(str);
    });

    afterEach(async () => {
        await new Promise(resolve => setImmediate(resolve));
    });

    describe('Extension validation', () => {
        it('should reject unsupported file extensions', async () => {
            const result = await FmiImporter.import('invalid.txt');
            expect(result.ok).toBe(false);
            expect(result.statusText).toContain('expected .fmu archive or .xml model description');
        });
    });

    describe('Smoke test: all FMU files', () => {
        let processedCount = 0;

        fmuFiles.forEach(testFile => {
            it(`should successfully import ${path.basename(testFile)}`, async () => {
                const result = await FmiImporter.import(testFile);
                if (!result.ok) logResponse(`import FMI for ${testFile}`, result);

                expect(result.status).toBe(0);
                expect(Array.isArray(result.response)).toBe(true);

                const items = result.response as any[];
                expect(items.length).toBeGreaterThan(0);
                expect(items[0].itemType).toBe(PigItemType.aPackage);

                console.log(`  ✓ ${path.basename(testFile)}: ${items.length - 1} items`);
                processedCount++;
            }, 30000);
        });

        it('Check the number of files processed', () => {
            expect(processedCount).toBe(fmuFiles.length);
        });
    });

    describe('Reference model: plant_Euler_0_001.fmu', () => {
        it('should map every FMI element to the expected CAS instances', async () => {
            if (!plantFmu) {
                logResponse('locate plant fmu', { ok: false, status: 404, statusText: 'plant_Euler_0_001.fmu not found' });
                return;
            }

            const result = await FmiImporter.import(plantFmu);
            if (!result.ok) logResponse('import plant fmu', result);

            expect(result.status).toBe(0);
            const items = result.response as any[];

            const instances = (clazz: string) => items.filter(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === clazz
            );

            // One FMU entity, 63 variables, one CoSimulation interface,
            // 11 log categories, one default experiment. The single SimpleType is an
            // enumeration, so it is mapped to a cas:Enumeration class (see below) and
            // there are no fmi:TypeDefinition instances.
            expect(instances('fmi:FMU').length).toBe(1);
            expect(instances('fmi:Variable').length).toBe(63);
            expect(instances('fmi:Interface').length).toBe(1);
            expect(instances('fmi:LogCategory').length).toBe(11);
            expect(instances('fmi:TypeDefinition').length).toBe(0);
            expect(instances('fmi:DefaultExperiment').length).toBe(1);

            // 6 ModelStructure unknowns expand into 21 (unknown, dependency) relationships.
            const relationships = items.filter((i: any) => i?.itemType === PigItemType.aRelationship);
            expect(relationships.length).toBe(21);

            // The self-contained 'fmi:' ontology must travel with the package.
            const entityClasses = items.filter((i: any) => i?.itemType === PigItemType.Entity);
            const linkClasses = items.filter((i: any) => i?.itemType === PigItemType.Link);
            const relClasses = items.filter((i: any) => i?.itemType === PigItemType.Relationship);
            const propClasses = items.filter((i: any) => i?.itemType === PigItemType.Property);
            const enumClasses = items.filter((i: any) => i?.itemType === PigItemType.Enumeration);
            // 8 entity classes: FMU, Variable, Unit, DisplayUnit, TypeDefinition,
            // Interface, LogCategory, DefaultExperiment.
            expect(entityClasses.length).toBe(8);
            // 12 static link classes + 1 per-enum value link (one enumeration here).
            expect(linkClasses.length).toBe(13);
            expect(relClasses.length).toBe(1);
            expect(propClasses.length).toBeGreaterThan(20);

            // The Modelica.Blocks.Types.Init enumeration is mapped to one cas:Enumeration
            // carrying its four Items (NoInit, SteadyState, InitialState, InitialOutput).
            expect(enumClasses.length).toBe(1);
            const initEnum: any = enumClasses[0];
            expect(Array.isArray(initEnum.enumeratedValue)).toBe(true);
            expect(initEnum.enumeratedValue.length).toBe(4);
            // Each item keeps its name (title) and encodes the FMI integer value in the id.
            const valueIds = initEnum.enumeratedValue.map((v: any) => v.id);
            expect(valueIds).toContain('fmi:enum-1-1');
            expect(valueIds).toContain('fmi:enum-1-4');

            console.log(`  ✓ plant: ${items.length - 1} graph items (incl. ontology + instances)`);
        }, 30000);

        it('should preserve rich variable metadata (spot-check)', async () => {
            if (!plantFmu) return;

            const result = await FmiImporter.import(plantFmu);
            expect(result.status).toBe(0);
            const items = result.response as any[];

            const variables = items.filter(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === 'fmi:Variable'
            );

            // var-1 in the model is 'transferFunction1.x_scaled[1]'
            const v = variables.find((x: any) => titleOf(x) === 'transferFunction1.x_scaled[1]');
            expect(v).toBeTruthy();
            expect(propValue(v, 'fmi:dataType')).toBe('Real');
            expect(propValue(v, 'fmi:causality')).toBe('local');
            expect(propValue(v, 'fmi:variability')).toBe('continuous');
            expect(propValue(v, 'fmi:valueReference')).toBe('0');

            // Every variable must carry a value reference and a data type.
            for (const variable of variables) {
                expect(propValue(variable, 'fmi:valueReference')).toBeDefined();
                expect(propValue(variable, 'fmi:dataType')).toBeDefined();
            }
        }, 30000);

        it('should resolve dependency relationships to source and target variables', async () => {
            if (!plantFmu) return;

            const result = await FmiImporter.import(plantFmu);
            expect(result.status).toBe(0);
            const items = result.response as any[];

            const relationships = items.filter((i: any) => i?.itemType === PigItemType.aRelationship);
            expect(relationships.length).toBeGreaterThan(0);

            for (const rel of relationships) {
                expect(rel.hasClass).toBe('fmi:dependsOn');
                expect(Array.isArray(rel.hasSourceLink)).toBe(true);
                expect(Array.isArray(rel.hasTargetLink)).toBe(true);
                expect(rel.hasSourceLink.length).toBe(1);
                expect(rel.hasTargetLink.length).toBeGreaterThanOrEqual(1);
                // Source/target must reference existing variable instances (normalized to data ns).
                expect(rel.hasSourceLink[0].idRef).toMatch(/var-\d+$/);
                expect(rel.hasTargetLink[0].idRef).toMatch(/var-\d+$/);
            }
        }, 30000);

        it('should capture additional CoSimulation capability flags', async () => {
            if (!plantFmu) return;

            const result = await FmiImporter.import(plantFmu);
            expect(result.status).toBe(0);
            const items = result.response as any[];

            const iface = items.find(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === 'fmi:Interface'
            );
            expect(iface).toBeTruthy();
            expect(propValue(iface, 'fmi:canInterpolateInputs')).toBe('false');
            expect(propValue(iface, 'fmi:canRunAsynchronuously')).toBe('false');
            expect(propValue(iface, 'fmi:canBeInstantiatedOnlyOncePerProcess')).toBe('false');
            expect(propValue(iface, 'fmi:canNotUseMemoryManagementFunctions')).toBe('false');
        }, 30000);
    });

    describe('Units, base-unit exponents and display units: edrive_mass.fmu', () => {
        const edriveFmu = fmuFiles.find(f => f.endsWith('edrive_mass.fmu'));

        it('should map units with per-axis SI exponents and shared display units', async () => {
            if (!edriveFmu) {
                logResponse('locate edrive fmu', { ok: false, status: 404, statusText: 'edrive_mass.fmu not found' });
                return;
            }

            const result = await FmiImporter.import(edriveFmu);
            if (!result.ok) logResponse('import edrive fmu', result);
            expect(result.status).toBe(0);
            const items = result.response as any[];

            const instances = (clazz: string) => items.filter(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === clazz
            );
            const targetRefs = (item: any, classId: string): string[] =>
                Array.isArray(item?.hasTargetLink)
                    ? item.hasTargetLink.filter((l: any) => l?.hasClass === classId).map((l: any) => l.idRef)
                    : [];

            // 7 <Unit> elements (one without a BaseUnit) and a single <DisplayUnit> ("deg").
            const units = instances('fmi:Unit');
            const displayUnits = instances('fmi:DisplayUnit');
            expect(units.length).toBe(7);
            expect(displayUnits.length).toBe(1);

            // 'N.m' decomposes into kg^1 m^2 s^-2 as individual integer exponent properties.
            const nm = units.find((u: any) => titleOf(u) === 'N.m');
            expect(nm).toBeTruthy();
            expect(propValue(nm, 'fmi:exp_kg')).toBe('1');
            expect(propValue(nm, 'fmi:exp_m')).toBe('2');
            expect(propValue(nm, 'fmi:exp_s')).toBe('-2');
            // The serialized 'fmi:baseUnit' string property no longer exists.
            expect(propValue(nm, 'fmi:baseUnit')).toBeUndefined();

            // The display unit 'deg' keeps its name (title) and factor, and is shared:
            const deg = displayUnits[0];
            expect(titleOf(deg)).toBe('deg');
            expect(propValue(deg, 'fmi:factor')).toBe('57.29577951308232');

            // The owning 'rad' unit links to the display unit, and at least one variable
            // that declares displayUnit="deg" links to the very same shared entity.
            const rad = units.find((u: any) => titleOf(u) === 'rad');
            expect(rad).toBeTruthy();
            const radDuRefs = targetRefs(rad, 'fmi:hasDisplayUnit');
            expect(radDuRefs.length).toBe(1);
            expect(radDuRefs[0]).toMatch(/displayunit-\d+-\d+$/);

            // In this model the displayUnit="deg" reference sits on the SI 'Angle' type
            // definition (variables inherit it via declaredType). Any consumer entity
            // (variable or type definition) must reference the same shared DisplayUnit.
            const allEntities = items.filter((i: any) => i?.itemType === PigItemType.anEntity);
            const consumerDuRefs = allEntities.flatMap((e: any) => targetRefs(e, 'fmi:variableHasDisplayUnit'));
            expect(consumerDuRefs.length).toBeGreaterThanOrEqual(1);
            expect(consumerDuRefs).toContain(radDuRefs[0]);
            const meIface = instances('fmi:Interface')[0];
            expect(meIface).toBeTruthy();
            expect(propValue(meIface, 'fmi:completedIntegratorStepNotNeeded')).toBe('true');
            expect(propValue(meIface, 'fmi:canNotUseMemoryManagementFunctions')).toBe('true');
        }, 30000);
    });

    describe('Additional variable scalar attributes: PID_Euler_0_01_sf.fmu', () => {
        const pidFmu = fmuFiles.find(f => f.endsWith('PID_Euler_0_01_sf.fmu'));

        it('should capture the reinit flag on at least one variable', async () => {
            if (!pidFmu) {
                logResponse('locate pid fmu', { ok: false, status: 404, statusText: 'PID_Euler_0_01_sf.fmu not found' });
                return;
            }
            const result = await FmiImporter.import(pidFmu);
            if (!result.ok) logResponse('import pid fmu', result);
            expect(result.status).toBe(0);
            const items = result.response as any[];

            const variables = items.filter(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === 'fmi:Variable'
            );
            const reinitVar = variables.find((v: any) => propValue(v, 'fmi:reinit') === 'true');
            expect(reinitVar).toBeTruthy();
        }, 30000);
    });

    describe('Raw modelDescription.xml path', () => {
        it('should import a raw modelDescription.xml directly', async () => {
            if (!fs.existsSync(plantXml)) {
                logResponse('locate plant xml', { ok: false, status: 404, statusText: `${plantXml} not found` });
                return;
            }

            const result = await FmiImporter.import(plantXml);
            if (!result.ok) logResponse('import plant xml', result);

            expect(result.status).toBe(0);
            expect(result.responseType).toBe('json');

            const items = result.response as any[];
            const variables = items.filter(
                (i: any) => i?.itemType === PigItemType.anEntity && i?.hasClass === 'fmi:Variable'
            );
            expect(variables.length).toBe(63);
        }, 30000);
    });
});
