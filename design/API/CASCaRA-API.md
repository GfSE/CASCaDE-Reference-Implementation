# CASCaRA Application Programming Interface (API)

This document defines the CASCaRA API as a **Platform Independent Model (PIM)** in OMG terms: a set of abstract operations, parameters and behaviors that any concrete binding (e.g. REST/OpenAPI, Java RFC, OData, or others) must realize. It deliberately avoids committing to a specific protocol, wire format, or transport-level mechanism (such as HTTP methods, status codes or headers). A concrete **Platform Specific Model (PSM)**, such as the OpenAPI specification in `cascara-api.yaml`, defines how each abstract operation and parameter is mapped onto the facilities of the chosen platform.

A CASCaRA knowledge graph is intended to be queried and mutated via APIs in software systems. The designed operations, options and formats generally encompass all capabilities, while implementations may choose to support only a subset according to chosen conformance criteria.

Definitions, see chapter 7.2 CASCaRA Metamodel:
- An Item is an instance of a metamodel class, thus either a CASCaRA type or instance. To be precise, only identifiable concrete items are considered in this context. See the concrete subclasses of metamodel class ‘Identifiable’.
- A Package is a collection of graph nodes and edges; in general all types and instances (“items”) defined by the CASCaRA metamodel. Packages can be nested. Packages have a type derived from ‘Organizer’; it may be a specialized subtype distinguishing them by purpose and defining special properties. See metamodel class ‘aPackage’ and its type ‘Entity’.
- A Repository is a managed container for items including packages. It holds the global graph.

At this point in time, the following aspects are out-of-scope:
- Permissions to use the operations of the API.
- Visibility of a package’s item from outside (‘public’ or ‘private’).

## Concise Description
The API provides CRUD-style (Create, Read, Update, Delete) operations, plus list/query, branch/merge and lifecycle operations, for every concrete metamodel item type of the CASCaRA Graph, namespace prefix ‘cas:’.
Concrete CASCaRA types: Enumeration, Property, Link, Entity and Relationship. Concrete CASCaRA instances: anEntity and aRelationship, aPackage. ‘aProperty’, ‘aSourceLink’ and ‘aTargetLink’ are not exposed as standalone resources because they have no identifier of their own and only exist as embedded parts of anEntity, aRelationship or aPackage.
For all read operations, the desired representation format (CASCaRA JSON-LD, CASCaRA XML, RDF Turtle, or XHTML) can be requested via the ‘format’ option. A concrete binding may offer this as an explicit parameter and/or via a platform-native content negotiation mechanism (e.g. the HTTP ‘Accept’ header); if both are offered and given, the explicit ‘format’ option takes precedence.

## Abstract Operation Kinds
Every concrete operation described below is one of the following abstract kinds. A binding maps each kind onto its own idiomatic mechanism (e.g. OpenAPI/REST: HTTP methods GET/POST/PUT/DELETE and status codes; Java RFC: remote procedure signatures and exceptions; OData: entity set/entity operations and `$`-system query options).

- **List**: Returns a collection of items or proxies, optionally filtered, sorted, and paged.
- **Create**: Instantiates a new item, with or without a caller-supplied ‘id’.
- **Read**: Returns a single item by ‘id’.
- **Update**: Mutates a single item by ‘id’, applying one of the write strategies ‘replace’, ‘update’ or ‘merge’ (see General Options).
- **Delete**: Removes a single item by ‘id’.
- **Action**: A named operation with side effects that does not fit the List/Create/Read/Update/Delete pattern (e.g. Branch, Merge, Compose, Commit, Rollback, Begin, Globalize, Localize).

## General Options (Parameters)
These options apply, where noted, across List, Read and Update operations, regardless of how a concrete binding exposes them (e.g. as query parameters, header fields, request attributes, or `$`-system options):
- replace: In an Update operation, the item is mutated regardless of the change date. Attributes ‘revision’ and ‘priorRevision’ are set. This is the default write strategy.
- update: In an Update operation, the item is mutated only if the change date is later than the existing item. Attributes ‘revision’ and ‘priorRevision’ are set.
- merge: In an Update operation, each item by ‘id’ is compared. If the incoming item has a priorRevision equal to the revision of the existing item, the latter is simply updated. If not, a new revision is created either manually or automatically, where the revisions of both the existing and the incoming item are listed as priorRevision.
- format: Selects the desired data-type of the result. All CASCaRA data-types, namely RDF/Turtle, JSON-LD, XML and Cypher/GQL plus XHTML are eligible; potentially others. Default: JSON-LD.
- limit: Limits the number of items returned by a List operation. Allows pagewise loading together with ‘offset’. Default: 100.
- offset: Selects the initial index of items returned by a List operation. Allows pagewise loading together with ‘limit’. Default: 0.
- query: A List operation may be filtered using a query supplied in SPARQL, GraphQL, XPath, Cypher/GQL or potentially other query languages; not all may be supported by a given implementation. Default: auto-detect the query language from the query's syntax.

Whether and how each option is exposed (e.g. as a named parameter, a header, or a system option) is a binding concern and out of scope of this PIM.

## Item-level Operations
The following operations shall be available at item-level:
- List all items, optionally filtered by attributes ‘itemType’, ‘specializes’, ‘type’ or by query.
- Create a new item with or without ‘id’.
- Read an item by ‘id’.
- Update (replace/update/merge) an item by ‘id’.
- Delete an item by ‘id’.
- Action, Globalize (for types): Globalize the title from a local or domain vocabulary to a ‘concept’ of the preferred vocabulary. A Multi-Vocabulary Facility (MVF) may be used for that purpose.
  The ‘globalTitle’ attribute of an entity, relationship or enumeration type is used to store it.
  In case of a relationship, it may happen that the global term is inverse of the local name, for example both oslc-rm:satisfies and oslc_rm:satisfied-by exist in practice. If we want to group all relationships with that meaning, we must reverse one of the respective sets. The ‘globalReversed’ attribute of a relationship type is used to store it.
- Action, Localize (for types): Localize the title from a ‘concept’ of the preferred vocabulary to a desired local or domain vocabulary. A Multi-Vocabulary Facility (MVF) may be used for that purpose.

## Package-level Operations
The following operations shall be available at package-level:
- List all packages with metadata only, optionally filtered by attribute ‘type’ or by query.
- Create a new package with or without ‘id’.
- Read (read/branch) a package by ‘id’.
- Update (replace/update/merge) a package by ‘id’. Optimistic locking is applied.
- Delete a package by ‘id’. The contained items are NOT deleted; they may be contained in other packages or remain as ‘orphans’ otherwise.
- Action, Add: Add a list of items by ‘id’ to the package.
- Action, Remove: Remove a list of items by ‘id’ from the package. Those items are NOT deleted; they may be contained in other packages or remain as ‘orphans’ otherwise.
- Action, List orphans: Get a list of orphaned items.
- Action, Delete orphans: Delete a list of orphaned items by ‘id’.
- Action, Branch: Branch (clone) a package by ‘id’ with all contained items by placing it into a newly created repository at the same service or host. Use Read to obtain the package to transfer it to another service or host.
- Action, Merge: Merge a package with another one by ‘id’. Use Update to merge a package from another service or host.

## Repository-level Operations
The following operations shall be available at repository-level:
- List all repositories with metadata only.
- Create a new repository with or without ‘id’.
- Read (read/branch) a repository by ‘id’. Only for data backup purposes.
- Update (replace/update/merge) a repository by ‘id’. Only for restore from data backup purposes.
- Delete a repository by ‘id’ including all packages and items.
- Action, Branch: Branch (clone) a repository by ‘id’ with all contained items by placing it into a newly created repository at the same service or host. Use Read to obtain the repository to transfer it to another service or host.
- Action, Merge: Merge a repository with another one by ‘id’. Use Update to merge a repository from another service or host.
- Action, Compose: Compose a package (subgraph) and the global graph. This may include a transformation from the source format to a CASCaRA conforming sub-graph plus a mapping of the domain terms to the loaded ontology represented by CASCaRA types (“Globalize”). Nodes representing the ‘same’ entity or relationship instance are unified while maintaining the original data. Nodes are considered the ‘same’, if type and title coincide. Optionally, the types are considered to coincide, if they have a common super-class within n levels. Optionally, the titles are considered to coincide, if they have a Levenshtein distance of m.
- Action, Commit: Commit all previous Create, Update, Delete, Branch, Merge and Compose operations on a repository by ‘id’ of the current user by access token or similar. All of those get the same ‘modified’ timestamp and the same revision tag. Other users do not see any change before it is committed. Concurrent updates of the same item is avoided by optimistic locking; the first commit prevails and any subsequent change to the same revision is rejected.
- Action, Rollback: Rollback (undo/cancel/abort) all previous Create, Update, Delete, Branch, Merge and Compose operations to a repository by ‘id’ of the current user since her or his last Commit.
- Action, Begin: Begin a transaction returning a transaction-id. Under consideration: Only needed in case a transaction shall include operations by multiple users (clients). Then, operations specify the same transaction-id and a Rollback affects all operations made with that transaction-id.

## Mapping to Concrete Bindings (Informative)
The table below illustrates, non-normatively, how the abstract operation kinds and options above may be realized by different platforms. A conformant binding is free to choose the most idiomatic mechanism of its platform as long as the described behavior is preserved.

| Abstract concept | OpenAPI/REST (PSM: `cascara-api.yaml`) | Java RFC | OData |
|---|---|---|---|
| List | `GET` on a collection resource | Remote method returning a collection | `GET` on an entity set, with `$filter`, `$top`, `$skip` |
| Create | `POST` on a collection resource | Remote method taking an item, returning the created item | `POST` on an entity set |
| Read | `GET` on an item resource | Remote method taking an ‘id’ | `GET` on an entity |
| Update | `PUT` on an item resource, with ‘mode’ query parameter (replace / update / merge) | Remote method taking an item and a mode flag | `PUT`/`PATCH` on an entity, with a custom parameter or header for the mode |
| Delete | `DELETE` on an item resource | Remote method taking an ‘id’ | `DELETE` on an entity |
| Action | A custom path segment / sub-resource, or a dedicated endpoint | A dedicated remote method | An OData bound/unbound Action or Function |
| format | ‘format’ query parameter or ‘Accept’ header | A format argument or return-type selector | ‘$format’ system query option or ‘Accept’ header |
| limit / offset | ‘limit’ / ‘offset’ query parameters | Pagination arguments | ‘$top’ / ‘$skip’ system query options |
| query | ‘query’ / ‘queryLanguage’ query parameters | A query argument plus a language selector | ‘$filter’ (OData's own query language), or a custom function for other query languages |
