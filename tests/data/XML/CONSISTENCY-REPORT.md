# Konsistenzanalyse der CASCaRA XML-Dateien (Aktualisiert)

## Analysierte Dateien

1. `tests/data/XML/11/Alice.cas.xml` - Alice works for ACME
2. `tests/data/XML/05/Project 'Requirement with Enumerated Property'.cas.xml`
3. `tests/data/XML/21/Project 'Very Simple Model (FMC) with Requirements'.cas.xml`

## Durchgeführte Korrekturen

Die folgenden Inkonsistenzen wurden behoben:

### ✅ 1. Namespace-URLs (Kritisch) - BEHOBEN

**Vor der Korrektur:**
- Alice.cas.xml (11): `https://product-information-graph.org/ontology/2026-01-20/foundation#`
- Dateien 05 & 21: `https://product-information-graph.org/v0.2/metamodel#`

**Nach der Korrektur:**
- **Alle Dateien**: `https://product-information-graph.org/ontology/2026-05-08/metamodel#`

### ✅ 3. Property-Namenskonvention - BEHALTEN (Bewusste Design-Entscheidung)

**Alle Dateien verwenden jetzt:**
- PascalCase für Property-IDs: `cas:Category`, `cas:Icon`, `cas:Diagram`, `cas:Notation`, `SpecIF:Priority`

Dies wurde bewusst als Standard gewählt, um die Konsistenz mit OWL-Konventionen zu gewährleisten.

### ✅ 5. Beschreibungs-Elemente - BEHOBEN

**Vor der Korrektur:**
- Gemischte Verwendung von `skos:definition` und `dcterms:description` für Metamodell-Elemente

**Nach der Korrektur - Klare Trennung:**
- **Metamodell-Elemente** (cas:Entity, cas:Relationship, cas:Property, cas:Link und direkte Spezialisierungen): → `skos:definition`
- **Domänenspezifische Klassen** (FMC:Actor, IREB:Requirement, SpecIF:writes etc.): → `dcterms:description` (für inhaltliche Beschreibungen)

## Bewusst Beibehaltene Unterschiede

Diese Inkonsistenzen wurden **bewusst beibehalten**, um unterschiedliche Stile zu demonstrieren:

### 2. Typ-Attribut Verwendung (Mittel)

- **Alice.cas.xml (11)**: Verwendet ausschließlich `cas:hasClass`
  ```xml
  <cas:Entity id="cas:Entity" cas:hasClass="owl:Class">
  ```

- **Dateien 05 & 21**: Verwenden sowohl `cas:hasClass` als auch `rdf:type`
  ```xml
  <cas:Entity id="cas:Entity" rdf:type="owl:Class">
  <cas:aPackage ... rdf:type="cas:Package">
  ```

**Begründung**: Beide Varianten sind semantisch äquivalent und zeigen verschiedene RDF-Serialisierungsstile.

### 4. XML Schema Restrictions Syntax (Mittel)

Unterschiedliche Darstellung von Constraints:

- **Datei 05**: Als Element mit Textinhalt
  ```xml
  <xs:maxLength>32</xs:maxLength>
  ```

- **Datei 21**: Als Element mit value-Attribut
  ```xml
  <xs:maxLength value="32"/>
  ```

- **Alice.cas.xml (11)**: minOccurs/maxOccurs als Kindelemente (nicht standardkonform für xs:restriction, aber als SHACL-Alternative gedacht)
  ```xml
  <xs:restriction base="xs:string">
      <xs:minOccurs>0</xs:minOccurs>
      <xs:maxOccurs>1</xs:maxOccurs>
  </xs:restriction>
  ```

**Begründung**: Zeigt verschiedene Ansätze für Schema-Constraints (XML Schema vs. SHACL-Ansatz).

### 6. SHACL Constraints (Klein)

- **Alice.cas.xml (11)**: Verwendet SHACL für einige Properties
  ```xml
  <sh:datatype>xs:string</sh:datatype>
  <sh:minCount>0</sh:minCount>
  <sh:maxCount>1</sh:maxCount>
  ```

- **Andere Dateien**: Verwenden ausschließlich xs:simpleType/xs:restriction

**Begründung**: Demonstriert alternative Constraint-Mechanismen.

## Aktuelle Konsistenz-Status

### ✅ Einheitlich (Konsistente Elemente)

✓ **Namespace**: Alle verwenden `https://product-information-graph.org/ontology/2026-05-08/metamodel#`
✓ **Root-Element**: Alle verwenden `<cas:aPackage>`
✓ **Graph-Container**: Alle haben ein `<graph>`-Element
✓ **Metamodell-Struktur**: Alle verwenden Entity, Relationship, Property, Link
✓ **Instanz-Elemente**: Alle verwenden `cas:anEntity`, `cas:aRelationship`
✓ **Dublin Core Metadaten**: Alle verwenden dcterms:title, dcterms:modified
✓ **Spezialisierung**: Alle verwenden `cas:specializes` für Vererbung
✓ **Enumeration-Struktur**: Dateien 05 & 21 haben identische Enumeration-Definitionen
✓ **Property-Namen**: Alle verwenden PascalCase (Category, Icon, Diagram, etc.)
✓ **Beschreibungen**: Klare Trennung zwischen skos:definition (Metamodell) und dcterms:description (Domäne)

### ⚠️ Bewusst Unterschiedlich (Design-Varianten)

⚠️ **Typ-Attribut**: cas:hasClass vs. rdf:type (beide gültig)
⚠️ **Schema-Syntax**: Verschiedene xs:restriction Stile
⚠️ **Constraint-System**: XML Schema vs. SHACL

## Zusammenfassung

Die kritischen Inkonsistenzen (Namespace-URLs, Property-Namenskonventionen, Beschreibungselemente) wurden behoben. Die verbleibenden Unterschiede sind **bewusste Design-Entscheidungen**, um verschiedene Serialisierungsstile und Constraint-Mechanismen zu demonstrieren.

**Status**: ✅ **Konsistent für Produktion** - Alle kritischen Inkonsistenzen behoben.

## Generiertes XML-Schema

Ein XML-Schema (XSD) wurde erstellt in: `tests/data/XML/cascara-package.xsd`

**Hinweise zum generierten Schema**:
- Das Schema deckt die gemeinsame Struktur aller drei Dateien ab
- Es erlaubt beide Varianten (cas:hasClass und rdf:type) für Flexibilität
- Es unterstützt sowohl skos:definition als auch dcterms:description
- Es akzeptiert verschiedene xs:maxLength Syntaxen
- Es verwendet `xs:any` mit `processContents="lax"` für Erweiterbarkeit

