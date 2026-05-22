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
export class PackageClass extends PigScaffold.OrganizerClass {
    type = PigScaffold.PigItemType.OrganizerClass;
    constructor(itm) {
        super(itm);
        this.validate(itm); // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm) {
        super.set(itm);
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get()
        }; // as IPackageClass;
    }
    validate(itm) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected OrganizerClass, but got ${itm.type}`);
        }
        ;
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
//# sourceMappingURL=pig-infrastructure.js.map