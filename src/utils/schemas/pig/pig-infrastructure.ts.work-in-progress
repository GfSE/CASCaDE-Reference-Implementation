// THIS is WORK IN PROGRESS!
// Questions: 
// - Shall we create classes for Packages etc, or shall those be instances of the metaclasses?

/** Product Information Graph (PIG) Infrastructure - standard object structure using the PIG
*   Dependencies: pig-scaffold
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/
import * as PigScaffold from './pig-scaffold';
export enum PigInfraType {
    Organizer = <any>'pig:Organizer', // is a PIG class
    anOrganizer = <any>'pig:anOrganizer', // is a PIG instance/individual
}
interface IModelElement extends PigScaffold.IEntity {
}
abstract class ModelElement extends PigScaffold.Entity implements IModelElement {
    constructor(itm: IModelElement) {
        super(itm);
    }
    set(itm: IModelElement) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
}
interface IAModelElement extends PigScaffold.IAnEntity {
}
abstract class AModelElement extends PigScaffold.AnEntity implements IAModelElement {
    constructor(itm: IAModelElement) {
        super(itm);
    }
    set(itm: IAModelElement) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
}
export interface IOrganizer extends PigScaffold.IEntity {
    // If the following is empty or undefined, any instantiated organizer is not constrained wrt the model element it references:
    eligibleElement: PigScaffold.TPigId[];  // constraint: must be UUIDs of Element, thus of Entity, Relationship or Organizer
}
export class Organizer extends PigScaffold.Entity implements IOrganizer {
    readonly type: PigScaffold.PigItemType;
    eligibleElement: PigScaffold.TPigId[];
    constructor(itm: IOrganizer) {
        super(itm);
        this.type = PigInfraType.Organizer;
        this.eligibleElement = itm.eligibleElement || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IOrganizer) {
        super.set(itm);
        this.eligibleElement = itm.eligibleElement || [];
    }
    get() {
        return {
            ...super.get(),
            eligibleElement: this.eligibleElement
        };
    }
    validate(itm: IOrganizer) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Organizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IAnOrganizer extends PigScaffold.IAnEntity {
    hasClass: PigScaffold.TPigId;  // constraint: must be UUID of Organizer
    // Hierarchy elements must reference exactly one model element, but diagrams can reference ('show') one or more model elements:
    hasElement: PigScaffold.TPigId[];  // constraint: must be UUIDs of objects of AnElement, thus of AnEntity, ARelationship or AnOrganizer
}
export class AnOrganizer extends PigScaffold.AnEntity implements IAnOrganizer {
    readonly type: PigItemType;
    hasClass!: PigScaffold.TPigId;
    hasElement!: PigScaffold.TPigId[];
    constructor(itm: IAnOrganizer) {
        super(itm);
        this.type = PigItemType.anOrganizer;
        this.hasClass = itm.hasClass;
        this.hasElement = itm.hasElement;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IAnOrganizer) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.hasElement = itm.hasElement;
    }
    get() {
        return {
            ...super.get(),
            hasClass: this.hasClass,
            hasElement: this.hasElement,
        };
    }
    validate(itm: IAnOrganizer) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected AnOrganizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}

export interface IPackage extends IOrganizer {
    namespace: PigScaffold.INamespace[];
    graph: PigScaffold.TPigItem[];
}
export class Package extends Organizer implements IPackage {
    namespace: PigScaffold.INamespace[];
    graph: PigScaffold.TPigItem[];
    constructor(itm: IPackage) {
        super(itm);
        this.namespace = itm.namespace || [];
        this.graph = itm.graph || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IPackage) {
        super.set(itm);
        this.namespace = itm.namespace || [];
        this.graph = itm.graph || [];
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            namespace: this.namespace,
            graph: this.graph
        } // as IPackage;
    }
    validate(itm: IPackage) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Organizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IOutline extends IOrganizer {
    lists: PigScaffold.Element[];
}
export class Outline extends Organizer implements IOutline {
    lists: PigScaffold.Element[];
    constructor(itm: IOutline) {
        super(itm);
        this.lists = itm.lists || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IOutline) {
        super.set(itm);
        this.lists = itm.lists || [];
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            lists: this.lists
        } // as IDiagram;
    }
    validate(itm: IOutline) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Organizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IDiagram extends IOrganizer {
    shows: PigScaffold.Element[];
    depicts: PigScaffold.Entity;
}
export class Diagram extends Organizer implements IDiagram {
    shows: PigScaffold.Element[];
    depicts: PigScaffold.Entity;
    constructor(itm: IDiagram) {
        super(itm);
        this.shows = itm.shows || [];
        this.depicts = itm.depicts;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IDiagram) {
        super.set(itm);
        this.shows = itm.shows || [];
        this.depicts = itm.depicts;
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            shows: this.shows,
            depicts: this.depicts
        } // as IDiagram;
    }
    validate(itm: IDiagram) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Organizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
