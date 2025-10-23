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
export interface IPackage extends PigScaffold.IOrganizer {
    namespace: PigScaffold.INamespace[];
    graph: PigScaffold.TPigItem[];
}
export class Package extends PigScaffold.Organizer implements IPackage {
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
export interface IOutline extends PigScaffold.IOrganizer {
    lists: PigScaffold.Element[];
}
export class Outline extends PigScaffold.Organizer implements IOutline {
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
export interface IDiagram extends PigScaffold.IOrganizer {
    shows: PigScaffold.Element[];
    depicts: PigScaffold.Entity;
}
export class Diagram extends PigScaffold.Organizer implements IDiagram {
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
