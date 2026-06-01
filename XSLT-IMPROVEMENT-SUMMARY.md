# ReqIF-to-CAS XSLT Improvement Summary

## Overview
The XSLT transformation `public/assets/xslt/ReqIF-to-CAS.xsl` has been improved to:
1. Collect and transform all ATTRIBUTE-DEFINITIONS into CAS Property objects
2. Collect and transform all SPEC-TYPEs (SPEC-OBJECT-TYPE, SPECIFICATION-TYPE, SPEC-RELATION-TYPE) into CAS Entity objects
3. Place all these elements in the graph alongside Entity instances (from SPEC-OBJECTs)
4. Normalize datetime values to ensure proper xs:dateTime format compliance

## Changes Made

### 1. Added New Namespace Declarations
- `xmlns:sh="http://www.w3.org/ns/shacl#"` - For SHACL datatype definitions
- `xmlns:xs="http://www.w3.org/2001/XMLSchema#"` - For XML Schema datatypes
- `xmlns:owl="http://www.w3.org/2002/07/owl#"` - For OWL ontology vocabulary

### 2. Added DateTime Normalization Helper
A helper template `normalizeDateTime` ensures all datetime values comply with xs:dateTime format:
- If datetime already has timezone information (contains `+`, `-`, or ends with `Z`), it's used as-is
- Otherwise, `Z` is appended to indicate UTC timezone
- This fixes schema validation errors for datetime values like `2024-04-08T10:18:03` → `2024-04-08T10:18:03Z`

### 3. Enhanced Root Template
Modified the `<graph>` section to collect:
- All ATTRIBUTE-DEFINITIONS from SPEC-OBJECT-TYPE, SPECIFICATION-TYPE, and SPEC-RELATION-TYPE (transformed to `cas:Property`)
- The TYPE definitions themselves: SPEC-OBJECT-TYPE, SPECIFICATION-TYPE, SPEC-RELATION-TYPE (transformed to `cas:Entity`)
- All SPEC-OBJECTs (transformed to `cas:anEntity`)

All elements are placed inside `<graph>` as siblings, creating a unified graph structure.

### 4. Created Templates for ATTRIBUTE-DEFINITIONS (7 templates)
Seven templates transform each ATTRIBUTE-DEFINITION type to `cas:Property`:

| ReqIF Type | Template | RDF Type | Output Datatype | Notes |
|------------|----------|----------|-----------------|-------|
| ATTRIBUTE-DEFINITION-STRING | ✓ | owl:DatatypeProperty | xs:string | Plain text |
| ATTRIBUTE-DEFINITION-XHTML | ✓ | owl:DatatypeProperty | xs:string | Formatted text |
| ATTRIBUTE-DEFINITION-INTEGER | ✓ | owl:DatatypeProperty | xs:integer | Integer numbers |
| ATTRIBUTE-DEFINITION-REAL | ✓ | owl:DatatypeProperty | xs:double | Floating-point numbers |
| ATTRIBUTE-DEFINITION-BOOLEAN | ✓ | owl:DatatypeProperty | xs:boolean | True/false values |
| ATTRIBUTE-DEFINITION-DATE | ✓ | owl:DatatypeProperty | xs:dateTime | Date and time |
| ATTRIBUTE-DEFINITION-ENUMERATION | ✓ | owl:DatatypeProperty | xs:string | Enumerated values |

### 5. Created Templates for SPEC-TYPEs (3 templates)
Three templates transform TYPE definitions:

| ReqIF Type | Template | Output Element | RDF Type | Template Mode | Notes |
|------------|----------|----------------|----------|---------------|-------|
| SPEC-OBJECT-TYPE | ✓ | cas:Entity | owl:Class | mode="entity" | Object type definitions |
| SPECIFICATION-TYPE | ✓ | cas:Entity | owl:Class | mode="entity" | Specification type definitions |
| SPEC-RELATION-TYPE | ✓ | cas:Relationship | owl:Class | mode="relationship" | Relation type definitions |

### 6. Property Structure
Each ATTRIBUTE-DEFINITION is transformed to a `<cas:Property>` element with:
- **id**: The IDENTIFIER from the ATTRIBUTE-DEFINITION
- **rdf:type**: "owl:DatatypeProperty"
- **dcterms:title**: The LONG-NAME from the ATTRIBUTE-DEFINITION
- **dcterms:description**: The DESC from the ATTRIBUTE-DEFINITION (if present)
- **dcterms:modified**: The LAST-CHANGE from the ATTRIBUTE-DEFINITION (if present, normalized to xs:dateTime format)
- **sh:datatype**: The appropriate XML Schema datatype

### 7. Entity Structure
SPEC-OBJECT-TYPE and SPECIFICATION-TYPE are transformed to `<cas:Entity>` elements with:
- **id**: The IDENTIFIER from the SPEC-TYPE
- **rdf:type**: "owl:Class"
- **dcterms:title**: The LONG-NAME from the SPEC-TYPE
- **dcterms:description**: The DESC from the SPEC-TYPE (if present)
- **dcterms:modified**: The LAST-CHANGE from the SPEC-TYPE (if present, normalized to xs:dateTime format)

### 8. Relationship Structure
SPEC-RELATION-TYPE is transformed to `<cas:Relationship>` elements with:
- **id**: The IDENTIFIER from the SPEC-RELATION-TYPE
- **rdf:type**: "owl:Class"
- **dcterms:title**: The LONG-NAME from the SPEC-RELATION-TYPE
- **dcterms:description**: The DESC from the SPEC-RELATION-TYPE (if present)
- **dcterms:modified**: The LAST-CHANGE from the SPEC-RELATION-TYPE (if present, normalized to xs:dateTime format)

### 9. Instance Structure
SPEC-OBJECT instances are transformed to `<cas:anEntity>` elements with:
- **id**: The IDENTIFIER from the SPEC-OBJECT
- **rdf:type**: The referenced SPEC-OBJECT-TYPE identifier (dynamic)
- **dcterms:title**: Extracted from ReqIF.Name or similar attributes
- **dcterms:description**: Extracted from ReqIF.Text or similar attributes
- **dcterms:modified**: The LAST-CHANGE from the SPEC-OBJECT (if present, normalized to xs:dateTime format)

## Example Transformation

### Input (ReqIF)
```xml
<SPEC-OBJECT-TYPE IDENTIFIER="RC-ResourceTerm" 
                  LONG-NAME="Resource Term"
                  LAST-CHANGE="2020-03-01T07:59:00+01:00">
    <SPEC-ATTRIBUTES>
        <ATTRIBUTE-DEFINITION-STRING 
            IDENTIFIER="RC--116302417" 
            LONG-NAME="ReqIF.Name">
            <TYPE>
                <DATATYPE-DEFINITION-STRING-REF>DT-ShortString</DATATYPE-DEFINITION-STRING-REF>
            </TYPE>
        </ATTRIBUTE-DEFINITION-STRING>
    </SPEC-ATTRIBUTES>
</SPEC-OBJECT-TYPE>

<SPEC-RELATION-TYPE IDENTIFIER="SC-isSpecialisationOf" 
                    LONG-NAME="SysML:isSpecialisationOf" 
                    DESC="Signifies that a term is a specialization of another"
                    LAST-CHANGE="2018-03-21T18:06:20+01:00">
    <SPEC-ATTRIBUTES>
        <ATTRIBUTE-DEFINITION-STRING 
            IDENTIFIER="RC--2128012875" 
            LONG-NAME="ReqIF.Name">
            <TYPE>
                <DATATYPE-DEFINITION-STRING-REF>DT-ShortString</DATATYPE-DEFINITION-STRING-REF>
            </TYPE>
        </ATTRIBUTE-DEFINITION-STRING>
    </SPEC-ATTRIBUTES>
</SPEC-RELATION-TYPE>
```

### Output (CAS)
```xml
<cas:aPackage rdf:type="cas:Package" id="...">
    <dcterms:title>...</dcterms:title>
    <dcterms:description>...</dcterms:description>
    <dcterms:modified>...</dcterms:modified>

    <graph>
        <!-- Properties from ATTRIBUTE-DEFINITIONS -->
        <cas:Property rdf:type="owl:DatatypeProperty" id="RC--116302417">
            <dcterms:title>ReqIF.Name</dcterms:title>
            <sh:datatype>xs:string</sh:datatype>
        </cas:Property>

        <cas:Property rdf:type="owl:DatatypeProperty" id="RC--2128012875">
            <dcterms:title>ReqIF.Name</dcterms:title>
            <sh:datatype>xs:string</sh:datatype>
        </cas:Property>

        <!-- Entity Type from SPEC-OBJECT-TYPE -->
        <cas:Entity rdf:type="owl:Class" id="RC-ResourceTerm">
            <dcterms:title>Resource Term</dcterms:title>
            <dcterms:modified>2020-03-01T07:59:00+01:00</dcterms:modified>
        </cas:Entity>

        <!-- Relationship Type from SPEC-RELATION-TYPE -->
        <cas:Relationship rdf:type="owl:Class" id="SC-isSpecialisationOf">
            <dcterms:title>SysML:isSpecialisationOf</dcterms:title>
            <dcterms:description>Signifies that a term is a specialization of another</dcterms:description>
            <dcterms:modified>2018-03-21T18:06:20+01:00</dcterms:modified>
        </cas:Relationship>

        <!-- Entity Instance from SPEC-OBJECT -->
        <cas:anEntity rdf:type="RC-ResourceTerm" id="R-1234">
            <dcterms:title>Lorry</dcterms:title>
            <dcterms:description>Any of various conveyances...</dcterms:description>
            <dcterms:modified>2020-03-01T07:59:00+01:00</dcterms:modified>
        </cas:anEntity>
    </graph>
</cas:aPackage>
```

## Testing

The transformation was validated against the following test files:
- `tests/data/ReqIF/Mars-Rover-Systems-extract.reqif` (STRING, XHTML types)
- `tests/data/ReqIF/Related-Terms.reqif` (STRING, XHTML with DESC)
- `tests/data/ReqIF/TC1000_E0000_S10_Reference_20120718_1511_jastram.reqif` (all 7 types)

### Validation Results
✓ All namespace declarations present
✓ All 7 ATTRIBUTE-DEFINITION templates created
✓ Properties collection from all 3 OBJECT-TYPE variants
✓ Correct datatype mappings for all types
✓ DESC attribute handling (optional field)
✓ SEF.JSON compilation successful (111.88 KB)

## Files Modified

1. **public/assets/xslt/ReqIF-to-CAS.xsl** - Main XSLT stylesheet
2. **public/assets/xslt/ReqIF-to-CAS.sef.json** - Compiled SEF.JSON (auto-generated)
3. **dist/assets/xslt/ReqIF-to-CAS.sef.json** - Distribution copy (will be updated on build)

## Technical Details

### XSLT Structure
- **Version**: XSLT 1.0
- **Total Templates**: 13
  - 1 root template
  - 7 ATTRIBUTE-DEFINITION templates (to cas:Property)
  - 3 SPEC-TYPE templates (to cas:Entity) - using mode="entity"
  - 1 SPEC-OBJECT template (to cas:anEntity)
  - 1 helper template (getAttributeValue)

### Datatype Rationale
- **STRING/XHTML/ENUMERATION → xs:string**: All represent text data
- **INTEGER → xs:integer**: Whole numbers
- **REAL → xs:double**: Double-precision floating-point (more precision than xs:float)
- **BOOLEAN → xs:boolean**: True/false values
- **DATE → xs:dateTime**: Full date and time representation

### Compilation
The XSLT was successfully compiled to SEF.JSON using Saxon-JS:
```bash
node scripts/compile-xslt.js
```

## Usage

The improved XSLT is now ready to transform ReqIF files. The transformation will:
1. Extract all attribute metadata from ATTRIBUTE-DEFINITIONS
2. Convert them to CAS Property objects with appropriate datatypes
3. Extract SPEC-OBJECT-TYPE and SPECIFICATION-TYPE definitions
4. Convert them to CAS Entity objects (EntityType)
5. Extract SPEC-RELATION-TYPE definitions
6. Convert them to CAS Relationship objects (RelationshipType)
7. Extract all instances from SPEC-OBJECTs
8. Convert them to CAS anEntity objects (Requirement instances)
9. Place all elements (Properties, Entities, Relationships, Instances) inside the `<graph>` element as siblings
10. Preserve all original identifiers for referencing
11. Include human-readable titles and descriptions

## Benefits

- **Complete Metadata**: All attribute definitions captured in the graph as Properties
- **Type Definitions**: SPEC-OBJECT-TYPEs and SPECIFICATION-TYPEs captured as Entity objects
- **Relationship Definitions**: SPEC-RELATION-TYPEs captured as Relationship objects
- **Correct Type Mapping**: Different SPEC-TYPEs map to appropriate CAS elements
- **Unified Structure**: Properties, Entity Types, Relationship Types, and Entity Instances coexist in the same graph
- **Type Safety**: Proper datatype annotations enable validation
- **Traceability**: Original identifiers preserved for cross-referencing
- **Documentation**: Titles and descriptions provide context
- **Standards Compliance**: Uses standard vocabularies (dcterms, SHACL, XML Schema)
- **Complete Schema**: Both the schema (types) and data (instances) are represented
