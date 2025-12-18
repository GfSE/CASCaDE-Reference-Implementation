/** This module implements a practical, programmatic Schematron-like validator for
// ReqIF (XML) files. It is NOT a full Schematron engine; instead it evaluates a
// selected set of rules (derived from the provided Schematron fragment) using
// XPath queries on a namespace-aware DOM.
//
// Main behaviour:
// - Parses the ReqIF XML and runs XPath checks (uses `xmldom` + `xpath`).
// - Produces an array of `IReqifIssue` objects describing findings:
//     { id?, location?, severity: 'error'|'warning'|'info', message }
//
// Implemented checks (maps to the Schematron rules):
// - R1.1 / R1.2: simple counts (SPEC-OBJECT and DATATYPES) reported as 'info'.
// - C1.*: presence of mandatory `LONG-NAME` on various definition elements.
// - C2.1 / C2.2: enumeration constraints (MULTI-VALUED vs value count; enum references).
// - C3.1 / C3.2 / C3.3: numeric ranges and string max-lengths for attribute values.
// - C5.*: ID / IDREF correspondence checks across many Ref contexts.
// - C6.*: XHTML checks (no use of class attribute, minimal checks for xhtml:object).
//
// Notes and usage:
// - This validator is intended for integration in tooling / CI where a quick,
//   readable list of issues is useful. It deliberately implements rules in JS/TS
//   for readability and easy extension rather than invoking an XSLT-based
//   Schematron processor.
// - Extend or tighten XPath expressions and regexes where stronger validation is
//   required (e.g. stricter URL validation, richer XHTML checks).
// - Dependencies: `xmldom` and `xpath`. Example: `npm install xmldom xpath`.
//
// Example:
//   import { validateReqIF } from './reqif-validator';
//   const issues = validateReqIF(xmlString);
//   issues.forEach(i => console.log(i.severity, i.message));
*/

import { DOMParser } from 'xmldom';
import xpath from 'xpath';

export interface IReqifIssue {
    id?: string;
    location?: string; // XPath to node or serialized nodeName/IDENTIFIER
    severity: 'error' | 'warning' | 'info';
    message: string;
}

const NS = {
    reqif: 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd',
    xhtml: 'http://www.w3.org/1999/xhtml'
};

const select = xpath.useNamespaces(NS);

function toString(node: Node | null): string {
    if (!node) return '';
    // @ts-ignore xmldom has toString on nodes
    return (node as any).toString ? (node as any).toString() : node.nodeName;
}

function escXPathLiteral(s: string) {
    // produce XPath literal that can contain quotes
    if (s.indexOf('"') === -1) return '"' + s + '"';
    if (s.indexOf("'") === -1) return "'" + s + "'";
    // both quotes present -> concat
    const parts = s.split('"').map(p => '"' + p + '"');
    return "concat(" + parts.join(', ' + "'\"'" + ', ') + ")";
}

export function validateReqIF(xml: string): IReqifIssue[] {
    const issues: IReqifIssue[] = [];
    const doc = new DOMParser().parseFromString(xml, 'application/xml');

    // Helper: count and report (R1.1 / R1.2)
    try {
        const nrSpecObjects = Number(select('count(//reqif:SPEC-OBJECT)', doc));
        issues.push({ severity: 'info', message: `R1.1 SpecObjects = ${nrSpecObjects}` });

        const nrDataTypes = Number(select('count(//reqif:DATATYPES/*)', doc));
        issues.push({ severity: 'info', message: `R1.2 DataTypes = ${nrDataTypes}` });
    } catch (e) {
        issues.push({ severity: 'warning', message: `Failed counting root elements: ${(e as Error).message}` });
    }

    // C1.* existence of @LONG-NAME on many definition elements
    const mandatoryLongNameContexts = [
        'reqif:ENUM-VALUE',
        'reqif:ATTRIBUTE-DEFINITION-BOOLEAN',
        'reqif:ATTRIBUTE-DEFINITION-DATE',
        'reqif:ATTRIBUTE-DEFINITION-ENUMERATION',
        'reqif:ATTRIBUTE-DEFINITION-INTEGER',
        'reqif:ATTRIBUTE-DEFINITION-REAL',
        'reqif:ATTRIBUTE-DEFINITION-STRING',
        'reqif:ATTRIBUTE-DEFINITION-XHTML',
        'reqif:RELATION-GROUP'
    ];
    for (const ctx of mandatoryLongNameContexts) {
        const nodes = select(`//${ctx}`, doc) as Node[];
        for (const n of nodes) {
            const attr = (n as Element).getAttribute && (n as Element).getAttribute('LONG-NAME');
            if (!attr || String(attr).trim() === '') {
                const id = (n as Element).getAttribute ? (n as Element).getAttribute('IDENTIFIER') : undefined;
                issues.push({
                    id: 'C1',
                    location: id ? `${ctx}[@IDENTIFIER=${id}]` : ctx,
                    severity: 'error',
                    message: `${ctx} is missing mandatory attribute LONG-NAME${id ? ` (IDENTIFIER=${id})` : ''}.`
                });
            }
        }
    }

    // C2.1: ATTRIBUTE-VALUE-ENUMERATION - check MULTI-VALUED vs number of values
    const avalEnums = select('//reqif:ATTRIBUTE-VALUE-ENUMERATION', doc) as Node[];
    for (const node of avalEnums) {
        const attrDef = select('string(./reqif:DEFINITION/reqif:ATTRIBUTE-DEFINITION-ENUMERATION-REF)', node) as string;
        const anzValues = Number(select('count(./reqif:VALUES/*)', node));
        let multiVal = select(`string(//reqif:ATTRIBUTE-DEFINITION-ENUMERATION[@IDENTIFIER = ${escXPathLiteral(attrDef)}]/@MULTI-VALUED)`, doc) as string;
        multiVal = (multiVal || '').trim().toLowerCase();
        const ok = (multiVal === 'true') || (anzValues <= 1);
        if (!ok) {
            issues.push({
                id: 'C2.1',
                location: `ATTRIBUTE-VALUE-ENUMERATION (definition=${attrDef})`,
                severity: 'error',
                message: `ATTRIBUTE-VALUE-ENUMERATION can contain >1 VALUE only if MULTI-VALUED=true on its ATTRIBUTE-DEFINITION-ENUMERATION (found ${anzValues}, MULTI-VALUED='${multiVal}').`
            });
        }
    }

    // C2.2: ENUM-VALUE-REF must reference an existing enumeration value
    const enumValueRefs = select('//reqif:ENUM-VALUE-REF', doc) as Node[];
    for (const node of enumValueRefs) {
        const ref = (select('string(.)', node) as string).trim();
        if (!ref) continue;
        const attrDefEnum = select('string(../../reqif:DEFINITION/reqif:ATTRIBUTE-DEFINITION-ENUMERATION-REF)', node) as string;
        const dataTypeDefEnum = select(`string(//reqif:ATTRIBUTE-DEFINITION-ENUMERATION[@IDENTIFIER = ${escXPathLiteral(attrDefEnum)}]/reqif:TYPE/reqif:DATATYPE-DEFINITION-ENUMERATION-REF)`, doc) as string;
        const nrEnumValue = Number(select(`count(//reqif:DATATYPE-DEFINITION-ENUMERATION[@IDENTIFIER = ${escXPathLiteral(dataTypeDefEnum)}]/reqif:SPECIFIED-VALUES/reqif:ENUM-VALUE[@IDENTIFIER = ${escXPathLiteral(ref)}])`, doc));
        if (nrEnumValue !== 1) {
            issues.push({
                id: 'C2.2',
                location: `ENUM-VALUE-REF (value=${ref})`,
                severity: 'error',
                message: `ENUM-VALUE-REF '${ref}' does not reference exactly one ENUM-VALUE in the referenced DATATYPE-DEFINITION-ENUMERATION (found ${nrEnumValue}).`
            });
        }
        // C5.21: check ID-IDREF must correspond (same as above, general)
        const elementExists = Number(select(`count(//reqif:ENUM-VALUE[@IDENTIFIER = ${escXPathLiteral(ref)}])`, doc)) === 1;
        if (!elementExists) {
            issues.push({
                id: 'C5.21',
                location: `ENUM-VALUE-REF (value=${ref})`,
                severity: 'error',
                message: `ID-IDREF must correspond: '${ref}' is not an existing reqif:ENUM-VALUE.`
            });
        }
    }

    // C3.* numeric and string constraints
    // C3.1 INTEGER range
    const avalInts = select('//reqif:ATTRIBUTE-VALUE-INTEGER', doc) as Node[];
    for (const n of avalInts) {
        const theValueStr = (select('string(@THE-VALUE)', n) as string).trim();
        if (theValueStr === '') continue;
        const theValue = Number(theValueStr);
        const attrDefInt = select('string(./reqif:DEFINITION/reqif:ATTRIBUTE-DEFINITION-INTEGER-REF/text())', n) as string;
        const dataTypeDefInt = select(`string(//reqif:ATTRIBUTE-DEFINITION-INTEGER[@IDENTIFIER = ${escXPathLiteral(attrDefInt)}]/reqif:TYPE/reqif:DATATYPE-DEFINITION-INTEGER-REF/text())`, doc) as string;
        const minStr = select(`string(//reqif:DATATYPE-DEFINITION-INTEGER[@IDENTIFIER = ${escXPathLiteral(dataTypeDefInt)}]/@MIN)`, doc) as string;
        const maxStr = select(`string(//reqif:DATATYPE-DEFINITION-INTEGER[@IDENTIFIER = ${escXPathLiteral(dataTypeDefInt)}]/@MAX)`, doc) as string;
        const min = minStr ? Number(minStr) : undefined;
        const max = maxStr ? Number(maxStr) : undefined;
        if (min !== undefined && theValue < min) {
            issues.push({ id: 'C3.1', severity: 'error', location: toString(n), message: `ATTRIBUTE-VALUE-INTEGER THE-VALUE ${theValue} < MIN ${min}` });
        }
        if (max !== undefined && theValue > max) {
            issues.push({ id: 'C3.1', severity: 'error', location: toString(n), message: `ATTRIBUTE-VALUE-INTEGER THE-VALUE ${theValue} > MAX ${max}` });
        }
    }

    // C3.2 REAL range (similar)
    const avalReals = select('//reqif:ATTRIBUTE-VALUE-REAL', doc) as Node[];
    for (const n of avalReals) {
        const theValueStr = (select('string(@THE-VALUE)', n) as string).trim();
        if (theValueStr === '') continue;
        const theValue = Number(theValueStr);
        const attrDefReal = select('string(./reqif:DEFINITION/reqif:ATTRIBUTE-DEFINITION-REAL-REF/text())', n) as string;
        const dataTypeDefReal = select(`string(//reqif:ATTRIBUTE-DEFINITION-REAL[@IDENTIFIER = ${escXPathLiteral(attrDefReal)}]/reqif:TYPE/reqif:DATATYPE-DEFINITION-REAL-REF/text())`, doc) as string;
        const minStr = select(`string(//reqif:DATATYPE-DEFINITION-REAL[@IDENTIFIER = ${escXPathLiteral(dataTypeDefReal)}]/@MIN)`, doc) as string;
        const maxStr = select(`string(//reqif:DATATYPE-DEFINITION-REAL[@IDENTIFIER = ${escXPathLiteral(dataTypeDefReal)}]/@MAX)`, doc) as string;
        const min = minStr ? Number(minStr) : undefined;
        const max = maxStr ? Number(maxStr) : undefined;
        if (min !== undefined && theValue < min) {
            issues.push({ id: 'C3.2', severity: 'error', location: toString(n), message: `ATTRIBUTE-VALUE-REAL THE-VALUE ${theValue} < MIN ${min}` });
        }
        if (max !== undefined && theValue > max) {
            issues.push({ id: 'C3.2', severity: 'error', location: toString(n), message: `ATTRIBUTE-VALUE-REAL THE-VALUE ${theValue} > MAX ${max}` });
        }
    }

    // C3.3 STRING max length
    const avalStrings = select('//reqif:ATTRIBUTE-VALUE-STRING', doc) as Node[];
    for (const n of avalStrings) {
        const theValue = (select('string(@THE-VALUE)', n) as string);
        const strLength = theValue.length;
        const attrDef = select('string(./reqif:DEFINITION/reqif:ATTRIBUTE-DEFINITION-STRING-REF/text())', n) as string;
        const dattypeDef = select(`string(//reqif:ATTRIBUTE-DEFINITION-STRING[@IDENTIFIER = ${escXPathLiteral(attrDef)}]/reqif:TYPE/reqif:DATATYPE-DEFINITION-STRING-REF/text())`, doc) as string;
        const maxLenStr = select(`string(//reqif:DATATYPE-DEFINITION-STRING[@IDENTIFIER = ${escXPathLiteral(dattypeDef)}]/@MAX-LENGTH)`, doc) as string;
        const maxLen = maxLenStr ? Number(maxLenStr) : undefined;
        if (maxLen !== undefined && strLength > maxLen) {
            issues.push({ id: 'C3.3', severity: 'error', location: toString(n), message: `ATTRIBUTE-VALUE-STRING length ${strLength} > MAX-LENGTH ${maxLen}` });
        }
    }

    // C5.* ID-IDREF correspondence checks for many contexts
    const idRefContexts = [
        { ctx: 'reqif:SPEC-OBJECT-TYPE-REF', target: 'reqif:SPEC-OBJECT-TYPE' },
        { ctx: 'reqif:SPEC-RELATION-TYPE-REF', target: 'reqif:SPEC-RELATION-TYPE' },
        { ctx: 'reqif:SPECIFICATION-TYPE-REF', target: 'reqif:SPECIFICATION-TYPE' },
        { ctx: 'reqif:RELATION-GROUP-TYPE-REF', target: 'reqif:RELATION-GROUP-TYPE' },
        { ctx: 'reqif:SPEC-RELATION-REF', target: 'reqif:SPEC-RELATION' },
        { ctx: 'reqif:SPEC-OBJECT-REF', target: 'reqif:SPEC-OBJECT' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-ENUMERATION-REF', target: 'reqif:ATTRIBUTE-DEFINITION-ENUMERATION' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-BOOLEAN-REF', target: 'reqif:ATTRIBUTE-DEFINITION-BOOLEAN' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-DATE-REF', target: 'reqif:ATTRIBUTE-DEFINITION-DATE' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-INTEGER-REF', target: 'reqif:ATTRIBUTE-DEFINITION-INTEGER' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-REAL-REF', target: 'reqif:ATTRIBUTE-DEFINITION-REAL' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-STRING-REF', target: 'reqif:ATTRIBUTE-DEFINITION-STRING' },
        { ctx: 'reqif:ATTRIBUTE-DEFINITION-XHTML-REF', target: 'reqif:ATTRIBUTE-DEFINITION-XHTML' },
        { ctx: 'reqif:DATATYPE-DEFINITION-BOOLEAN-REF', target: 'reqif:DATATYPE-DEFINITION-BOOLEAN' },
        { ctx: 'reqif:DATATYPE-DEFINITION-DATE-REF', target: 'reqif:DATATYPE-DEFINITION-DATE' },
        { ctx: 'reqif:DATATYPE-DEFINITION-ENUMERATION-REF', target: 'reqif:DATATYPE-DEFINITION-ENUMERATION' },
        { ctx: 'reqif:DATATYPE-DEFINITION-INTEGER-REF', target: 'reqif:DATATYPE-DEFINITION-INTEGER' },
        { ctx: 'reqif:DATATYPE-DEFINITION-REAL-REF', target: 'reqif:DATATYPE-DEFINITION-REAL' },
        { ctx: 'reqif:DATATYPE-DEFINITION-STRING-REF', target: 'reqif:DATATYPE-DEFINITION-STRING' },
        { ctx: 'reqif:DATATYPE-DEFINITION-XHTML-REF', target: 'reqif:DATATYPE-DEFINITION-XHTML' }
    ];
    for (const spec of idRefContexts) {
        const nodes = select(`//${spec.ctx}`, doc) as Node[];
        for (const node of nodes) {
            const ref = (select('normalize-space(.)', node) as string).trim();
            if (!ref) continue;
            const countTarget = Number(select(`count(//${spec.target}[@IDENTIFIER = ${escXPathLiteral(ref)}])`, doc));
            if (countTarget !== 1) {
                issues.push({
                    id: 'C5',
                    severity: 'error',
                    location: `${spec.ctx} (value=${ref})`,
                    message: `ID-IDREF must correspond: '${ref}' does not resolve to exactly one ${spec.target} (found ${countTarget}).`
                });
            }
        }
    }

    // C6.1 ATTRIBUTE-VALUE-XHTML must not use class attribute anywhere inside
    const attrValueXhtmlNodes = select('//reqif:ATTRIBUTE-VALUE-XHTML', doc) as Node[];
    for (const n of attrValueXhtmlNodes) {
        const classCount = Number(select('count(.//@class)', n));
        if (classCount > 0) {
            issues.push({
                id: 'C6.1',
                severity: 'error',
                location: toString(n),
                message: `The XHTML class attribute must not be used (found ${classCount} occurrences).`
            });
        }
    }

    // C6.2..C6.6 - check xhtml:object attributes basic heuristics
    const xhtmlObjects = select('//reqif:ATTRIBUTE-VALUE-XHTML//xhtml:object', doc) as Node[];
    const urlRegex = /^(https?:\/\/|www\.)/i;
    for (const obj of xhtmlObjects) {
        const type = (select('string(@type)', obj) as string).trim();
        const data = (select('string(@data)', obj) as string).trim();
        const text = (select('string(normalize-space(.))', obj) as string).trim();

        // C6.5 data attribute must exist
        if (!data) {
            issues.push({ id: 'C6.5', severity: 'error', location: toString(obj), message: 'xhtml:object.@data must exist' });
        } else {
            // C6.4 basic URL test
            if (!urlRegex.test(data)) {
                issues.push({ id: 'C6.4', severity: 'error', location: toString(obj), message: `Malformed URL in @data: ${data}` });
            }
        }

        // C6.2 for png external object minimal heuristic
        if (data && !data.endsWith('.png') && type !== 'image/png') {
            if (!(type === 'image/png' && text !== '' && data.endsWith('.png'))) {
                issues.push({ id: 'C6.2', severity: 'warning', location: toString(obj), message: 'External object not image/png or missing alternative text/alt image heuristic.' });
            }
        }

        // C6.3 only width/height/type/data allowed
        const allowed = ['width', 'height', 'type', 'data'];
        // @ts-ignore
        const attrs = (obj as Element).attributes;
        if (attrs) {
            const extra = [];
            for (let i = 0; i < attrs.length; i++) {
                const an = attrs.item(i)!.name;
                if (!allowed.includes(an)) extra.push(an);
            }
            if (extra.length > 0) {
                issues.push({ id: 'C6.3', severity: 'warning', location: toString(obj), message: `xhtml:object has disallowed attributes: ${extra.join(', ')}` });
            }
        }
    }

    return issues;
}

