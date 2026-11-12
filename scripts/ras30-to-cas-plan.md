# RAS 3.0 to CASCaRA Type Transformation

## Understanding
CASCaRA type definitions: every UML class → `cas:Entity`, every attribute → `cas:Property`, every composition (`*--`) → `cas:Link`. 
The result is a JSON-LD file `packages/common/ontology/ras30/ras30.cas.jsonld` with `@context` and `@graph`. 
Only the type level (no instance data) is produced in this step. The top-level package document uses `cas:manifest-RAS30` (a subtype of `cas:Package`) 
as its `@type`; this subtype and the meta-types it specializes are defined in `packages/common/ontology/Semantic-Infrastructure/CASCaRA-Semantic-Infrastructure.cas.jsonld`, 
which is referenced (not copied) and must be loaded first, with this document applied afterwards using 'update' semantics.

## Assumptions
- IDs use the `ras30:` prefix, e.g. `ras30:Ras30core`, `ras30:Ras30core.identityAndIntent` for properties, `ras30:Ras30core_identityAndIntent` for links.
- Attributes with a complex type (reference to another UML class, e.g. `assetId : AssetId`) are modeled as `cas:Link` (composition), not as `cas:Property`, 
since they are already represented as compositions (`*--`) in the diagram's associations. Primitive attributes (string, enum, List«string» etc.) are modeled 
as `cas:Property`.
- Enum attributes (e.g. `idScheme : enum: UUID, URI, DOI, ARK`) are simplified and mapped as `sh:datatype xs:string` with a description of the allowed values 
in `dcterms:description` (no separate `cas:Enumeration` class in this first step, since RAS 3.0 itself does not define reusable enumerations shared across classes).
- Cardinalities: `<<required>>` → `sh:minCount: 1`; `List«...»` or `<<optional>>` are mapped accordingly to `sh:minCount`/`sh:maxCount` 
(optional: minCount 0; list: no maxCount; single: maxCount 1).
- `specializes` is supported per the user's decision, but is not present in the current RAS 3.0 diagram (no inheritance) – the code structure nevertheless provides 
for this field for future extensions.
- The script is run once with `tsx`/`ts-node` via a new npm script `generate:ras30-types` and writes the file deterministically (no runtime import into the app).
- Data types are mapped to `xs:string`, `xs:date`, `xs:dateTime` etc. based on the type information in the PlantUML/CSV (`string`, `string (date)`, `string (date-time)`, 
`string (uri)`).

## Approach
The source model is captured as a small, hand-curated TypeScript data structure (`RAS30_CLASSES`) within the script itself (name, list of primitive attributes with data t
ype/cardinality/description, list of composition relationships to other classes with cardinality), derived 1:1 from 
`design/RAS_30_Tramsformation/Specification/RAS30_UML_Class_Diagram_Detailed.puml`. 
A transformation function iterates over this structure and produces for each class a `cas:Entity` object (with `cas:enumeratedProperty` 
and `cas:enumeratedTargetLink` references), for each primitive attribute a `cas:Property` object, and for each composition 
a `cas:Link` object (with `cas:enumeratedEndpoint` pointing to the target class). 
The format strictly follows the existing JSON-LD schemata in `packages/vue/public/assets/jsonld/Entity.json`, `Property.json`, `Link.json` 
and `aPackage.json` (same property names: `@id`, `@type`, `cas:itemType`, `dcterms:title`, `dcterms:description`, `sh:datatype`, `sh:minCount`, 
`sh:maxCount`, `cas:enumeratedProperty`, `cas:enumeratedTargetLink`, `cas:enumeratedEndpoint`). 
No external JSONPath/XPath library is used, since the transformation is structural (model-to-model) rather than path-based. 
The final document is written as an `@context` + `@graph` package.

## Key Files
- `scripts/ras30-to-cas.ts` - transformation script (source model data + transformation logic + file output)
- `packages/common/ontology/ras30/ras30.cas.jsonld` - generated output file
- `package.json` - npm script `generate:ras30-types`
- `packages/vue/public/assets/jsonld/Entity.json`, `Property.json`, `Link.json`, `aPackage.json` - reference schemata for correct JSON-LD format
- `packages/common/ontology/Semantic-Infrastructure/CASCaRA-Semantic-Infrastructure.cas.jsonld` - defines the `cas:Package`, `cas:Entity`, `cas:Property` 
and `cas:Link` meta-types referenced (not copied) by ras30.cas.jsonld
- `design/RAS_30_Tramsformation/Specification/RAS30_UML_Class_Diagram_Detailed.puml` - source for classes/attributes/associations

## Risks & Open Questions
- `tsx` was added as a devDependency to run the script directly.
- Enum attributes are simplified and mapped without a dedicated cas:Enumeration class; if enumerations need to be reused later, the script must be extended.
- The `@context` `cas:` namespace URI in ras30.cas.jsonld must stay aligned with the one used in CASCaRA-Semantic-Infrastructure.cas.jsonld 
(`https://product-information-graph.org/semantic-infrastructure/2026-11-03/cas-jsonld#`), otherwise references to `cas:Package`, `cas:Entity`, 
`cas:Property` and `cas:Link` would not resolve to the same vocabulary.

## Steps
1. Check whether tsx/ts-node is available in the repo, add as devDependency if needed — **completed**: tsx installed as devDependency in the root package.json.
2. Create target directory packages/common/ontology/ras30/ — **completed**: via fs.mkdirSync recursive in the script.
3. Capture source model data structure (RAS30_CLASSES) in the script (16 classes, attributes, compositions) — **completed**.
4. Implement transformation functions (Entity, Property, Link generation incl. ras30:* ID conventions) — **completed**.
5. Implement @context and overall document assembly as well as file writing logic — **completed**: top-level document includes `@type: cas:Package`, 
`cas:itemType: { @id: cas:aPackage }` and `dcterms:modified`, following the aPackage.json schema and the CASCaRA-Semantic-Infrastructure.cas.jsonld pattern.
6. Add npm script generate:ras30-types to package.json — **completed**.
7. Run the script and inspect the generated ras30.cas.jsonld file — **completed**: 16 entities, 28 properties, 15 links generated.
8. Spot-validate the generated file against the Entity.json/Property.json/Link.json schemata, and the top-level document against aPackage.json — **completed**: 
59 graph items plus the package-level document, 0 errors (ad-hoc validation script permanently stored as `scripts/validate-ras30-types.ts`).

## Status
Plan fully implemented. Next step (not part of this plan): transformation of RAS 3.0 data instances into CASCaRA graph instances (`cas:anEntity`/`cas:aRelationship`) 
using the types generated here.
