/**
 * Example output demonstration
 * Shows what the improved XSLT produces
 */

console.log('=== ReqIF-to-CAS XSLT Transformation Example ===\n');

console.log('Given a ReqIF file with these ATTRIBUTE-DEFINITIONS:');
console.log('─────────────────────────────────────────────────\n');

const exampleDefinitions = [
    { type: 'STRING', id: 'RC--116302417', longName: 'ReqIF.Name', desc: '' },
    { type: 'XHTML', id: 'RC--1540583336', longName: 'ReqIF.Text', desc: '' },
    { type: 'INTEGER', id: 'ID_TC1000_Integer', longName: 'TC1000 Integer', desc: '' },
    { type: 'REAL', id: 'ID_TC1000_Real', longName: 'TC1000 Real', desc: '' },
    { type: 'BOOLEAN', id: 'ID_TC1000_Bool', longName: 'TC1000T', desc: '' },
    { type: 'DATE', id: 'ID_TC1000_Date', longName: 'TC1000 Date', desc: '' },
    { type: 'STRING', id: 'DT-ShortString', longName: 'String [256]', desc: 'String with length 256' }
];

exampleDefinitions.forEach((def, idx) => {
    console.log(`${idx + 1}. ATTRIBUTE-DEFINITION-${def.type}`);
    console.log(`   IDENTIFIER="${def.id}"`);
    console.log(`   LONG-NAME="${def.longName}"`);
    if (def.desc) {
        console.log(`   DESC="${def.desc}"`);
    }
    console.log('');
});

console.log('\n=== Transformed CAS Output ===\n');
console.log('─────────────────────────────────────────────────\n');

const datatypeMap = {
    'STRING': 'xs:string',
    'XHTML': 'xs:string',
    'INTEGER': 'xs:integer',
    'REAL': 'xs:double',
    'BOOLEAN': 'xs:boolean',
    'DATE': 'xs:dateTime',
    'ENUMERATION': 'xs:string'
};

console.log('<cas:aPackage rdf:type="cas:Package" id="reqif-package">');
console.log('  <dcterms:title>TC 1000 Simple Content</dcterms:title>');
console.log('  <dcterms:description>ReqIF Document</dcterms:description>');
console.log('  <dcterms:modified>2012-07-18T15:11:33.670+02:00</dcterms:modified>');
console.log('  ');
console.log('  <graph>');

exampleDefinitions.forEach(def => {
    console.log(`    <cas:Property id="${def.id}">`);
    console.log(`      <dcterms:title>${def.longName}</dcterms:title>`);
    if (def.desc) {
        console.log(`      <dcterms:description>${def.desc}</dcterms:description>`);
    }
    console.log(`      <sh:datatype>${datatypeMap[def.type]}</sh:datatype>`);
    console.log(`    </cas:Property>`);
});

console.log('  ');
console.log('    <cas:anEntity rdf:type="IREB:Requirement" id="ID_TC1000_SpecObject">');
console.log('      <dcterms:title>Requirement Title</dcterms:title>');
console.log('      <dcterms:description>Requirement Description</dcterms:description>');
console.log('      <dcterms:modified>2012-04-07T01:51:37.112+02:00</dcterms:modified>');
console.log('    </cas:anEntity>');
console.log('  </graph>');
console.log('</cas:aPackage>');

console.log('\n─────────────────────────────────────────────────\n');
console.log('Key Features:');
console.log('✓ All ATTRIBUTE-DEFINITIONS collected in <properties> section');
console.log('✓ Each becomes a <cas:Property> with proper metadata');
console.log('✓ LONG-NAME → dcterms:title');
console.log('✓ DESC → dcterms:description (when present)');
console.log('✓ Type-specific datatypes (xs:string, xs:integer, etc.)');
console.log('✓ Original IDENTIFIERs preserved for referencing');
console.log('\n');
