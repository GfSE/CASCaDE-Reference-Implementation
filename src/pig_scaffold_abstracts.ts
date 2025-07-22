/** Product Information Graph (PIG) Scaffold - the basic object structure
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, chrissaenz@psg-inc.net, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*/
import { Property, PropertyClass } from "./pig_scaffold";

export interface IConfigurationItem {
    id: string;
    revision: string;
    modified: Date;
    creator: string;
    title: string;
    description?: string;
}
export class ConfigurationItem implements IConfigurationItem {
    id!: string;
    revision!: string;
    modified!: Date;
    creator!: string;
    title!: string;
    description?: string;

    constructor(itm: IConfigurationItem) {
        this.set(itm);
    }

    set(itm: IConfigurationItem) {
        this.id = itm.id;
        this.revision = itm.revision;
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.title = itm.title;
        this.description = itm.description;
    }

    get() {
        return {
            id: this.id,
            revision: this.revision,
            modified: this.modified,
            creator: this.creator,
            title: this.title,
            description: this.description
        };
    }
}

export class Element extends ConfigurationItem {
    property!: Property;

    constructor(itm: IConfigurationItem, property: Property) {
        super(itm);
        this.property = property;
    }
}

export class ModelElement extends Element {
    constructor(itm: IConfigurationItem, property: Property) {
        super(itm, property);
    }
}

export class ElementClass extends ConfigurationItem {
    propertyClasses?: PropertyClass[];
    
    constructor(itm: IConfigurationItem, propertyClasses?: PropertyClass[]) {
        super(itm);

        this.propertyClasses = propertyClasses;
    }
}

export class ModelElementClass extends ElementClass {
    icon?: string;

    constructor(itm: IConfigurationItem, icon?: string) {
        super(itm);

        this.icon = icon;
    }
}
