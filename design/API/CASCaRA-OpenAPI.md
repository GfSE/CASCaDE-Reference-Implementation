# CASCaRA Application Programming Interface (API)

A CASCaRA knowledge graph is intended to be queried and mutated via APIs in software systems. The designed endpoints and commands provided by API generally shall encompass all operations, options and formats, while implementations may choose to support only a subset according to chosen conformance criteria.
Definitions, see chapter 7.2 CASCaRA Metamodel:
- An Item is an instance of a metamodel class, thus either a CASCaRA type or instance. To be precise, only identifiable concrete items are considered in this context. See the concrete subclasses of metamodel class ‘Identifiable’.
- A Package is a collection of graph nodes and edges; in general all types and instances (“items”) defined by the CASCaRA metamodel. Packages can be nested. Packages have a type derived from ‘Organizer’; it may be a specialized subtype distinguishing them by purpose and defining special properties. See metamodel class ‘aPackage’ and its type ‘Entity’. 
- A Repository is a managed container for items including packages. It holds the global graph.
At this point in time, the following aspects are out-of-scope:
- Permissions to use the endpoints and operations of the API.
- Visibility of a package’s item from outside (‘public’ or ‘private’).

## Concise Description
REST API providing CRUD (Create, Read, Update, Delete) operations for every concrete metamodel item type of the CASCaRA Graph, namespace prefix ‘cas:’.
Concrete CASCaRA types: Enumeration, Property, Link, Entity and Relationship. Concrete CASCaRA instances: anEntity and aRelationship, aPackage. ‘aProperty’, ‘aSourceLink’ and ‘aTargetLink’ are not exposed as standalone resources because they have no identifier of their own and only exist as embedded parts of anEntity, aRelationship or aPackage.
For all read (GET) operations, the desired representation format (‘cas.jsonld’ / ‘application/ld+json’, ‘cas.xml’ / ‘application/xml’, ‘cas.ttl’ / ‘text/turtle’, or ‘cas.xhtml’ / ‘application/xhtml+xml’) can be requested either via the ‘format’ query parameter or via the standard HTTP ‘Accept’ header; if both are given, ‘format’ takes precedence.

## General Options (Query Parameters)
- replace: In a PUT operation, the item is mutated regardless of the change date. Attributes ‘revision’ and priorRevision’ are set. Default: ‘replace’.
- update: In a PUT operation, the item is mutated only if the change date is later than the existing item. Attributes ‘revision’ and priorRevision’ are set. Default: ‘replace’.
- merge: In a PUT operation, each item by ‘id’ is compared. If the incoming item has a priorRevision equal to the revision of the existing item, the latter is simply updated. If not, a new revision is created either manually or automatically, where the revisions of both the existing and the incoming item are listed as priorRevision.
- format: Select the desired data-type of the response using standard HTTP header info. All CASCaRA data-types, namely RDF/Turtle, JSON-LD, XML and Cypher/GQL plus XHTML are eligible; potentially others. Default: JSON-LD.
- limit: Limit the number of items returned using standard HTTP header info. Allows pagewise loading together with ‘offset’. Default: 100.
- offset: Select the initial index of items returned using standard HTTP header info. Allows pagewise loading together with ‘limit’. Default: 0.
- A query may be supplied using SPARQL, GraphQL, XPATH, Cypher/GQL or potentially other; not all may be supported by a given implementation. Default: auto-detect.

## Item-level Operations
The following operations shall be available at item-level:
- GET all items, optionally filtered by attributes ‘itemType’, ‘specializes’, ‘type’ or by query.
- POST (create) a new item with or without ‘id’.
- GET (read) an item by ‘id’.
- PUT (replace/update/merge) an item by ‘id’.
- DELETE an item by ‘id’.
- For types: Globalize the title from a local or domain vocabulary to a ‘concept’ of the preferred vocabulary. A Multi-Vocabulary Facility (MVF) may be used for that purpose.
The ‘globalTitle’ attribute of an entity, relationship or enumeration type is used to store it.
In case of a relationship, it may happen that the global term is inverse of the local name, for example both oslc-rm:satisfies and oslc_rm:satisfied-by exist in practice. If we want to group all relationship with that meaning, we must reverse one of the respective sets. The ‘globalReversed’ attribute of a relationship type is  to store it.
- For types: Localize the title from a ‘concept’ of the preferred vocabulary to a desired local or domain vocabulary. A Multi-Vocabulary Facility (MVF) may be used for that purpose.

## Package-level Operations
The following operations shall be available at package-level:
- GET all packages with metadata only, optionally filtered by attribute ‘type’ or by query.
- POST (create) a new package with or without ‘id’.
- GET (read/branch) a package by ‘id’.
- PUT (replace/update/merge) a package by ‘id’. Optimistic locking is applied.
- DELETE a package by ‘id’. The contained items are NOT deleted; they may be contained in other packages or remain as ‘orphans’ otherwise.
- Add a list of items by ‘id’ to the package.
- Remove a list of items by ‘id’ from the package. Those items are NOT deleted; they may be contained in other packages or remain as ‘orphans’ otherwise.
- Get a list of orphaned items.
- Delete a list of orphaned items by ‘id’.
- BRANCH (clone) a package by ‘id’ with all contained items by placing it into a newly created repository at the same service or host. Use GET to obtain the package to transfer it to another service or host.
- MERGE a package with another one by ‘id’. Use PUT to merge a package from another service or host.

## Repository-level Operations
The following operations shall be available at repository-level:
- GET all repositories with metadata only.
- POST (create) a new repository with or without ‘id’.
- GET (read/branch) a repository by ‘id’. Only for data backup purposes.
- PUT (replace/update/merge) a repository by ‘id’. Only for restore from data backup purposes.
- DELETE a repository by ‘id’ including all packages and items. 
- BRANCH (clone) a repository by ‘id’ with all contained items by placing it into a newly created repository at the same service or host. Use GET to obtain the repository to transfer it to another service or host.
- MERGE a repository with another one by ‘id’. Use PUT to merge a repository from another service or host.
- COMPOSE a package (subgraph) and the global graph. This may include a transformation from the source format to a CASCaRA conforming sub-graph plus a mapping of the domain terms to the loaded ontology represented by CASCaRA types (“Globalize”). Nodes representing the ‘same’ entity or relationship instance are unified while maintaining the original data. Nodes are considered the ‘same’, if type and title coincide. Optionally, the types are considered to coincide, if they have a common super-class within n levels. Optionally, the titles are considered to coincide, if they have a Levenshtein distance of m.
- COMMIT all previous POST, PUT, DELETE, BRANCH, MERGE and COMPOSE operations on a repository by ‘id’ of the current user by access token or similar. All of those get the same ‘modified’ timestamp and the same revision tag. Other users do not see any change before it is committed. Concurrent updates of the same item is avoided by optimistic locking; the first commit prevails and any subsequent change to the same revision is rejected.
- ROLLBACK (undocancel/abort) all previous POST, PUT, DELETE, BRANCH, MERGE and COMPOSE operations to a repository by ‘id’ of the current user since her or his last COMMIT, 
- BEGIN a transaction returning a transaction-id. Under consideration: Only needed in case a transaction shall include operations by multiple users (clients). Then, operations specify the same transaction-id and a ROLLBACK affects all operations made with that transaction-id.
