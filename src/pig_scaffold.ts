// --- Property Class with Validation ---
export class Property {
  constructor(
    public name: string,
    public value: any,
    public dataType: string,
    public maxLength?: number,
    public required: boolean = false
  ) {
    this.validate();
  }

  validate(): void {
    if (this.required && this.value == null) {
      throw new Error(`Property '${this.name}' is required.`);
    }
    if (this.dataType === "xs:string" && this.maxLength !== undefined) {
      if (typeof this.value !== "string") {
        throw new TypeError(`Property '${this.name}' must be a string.`);
      }
      if (this.value.length > this.maxLength) {
        throw new Error(`Property '${this.name}' exceeds max length of ${this.maxLength}.`);
      }
    }
  }

  static fromDict(data: any): Property {
    return new Property(data.name, data.value, data.dataType, data.maxLength, data.required);
  }

  toDict(): any {
    return {
      name: this.name,
      value: this.value,
      dataType: this.dataType,
      maxLength: this.maxLength,
      required: this.required
    };
  }
}

// --- Base PIG Element ---
import { v4 as uuidv4 } from "uuid";

export class PIGElement {
  public id: string;
  public properties: { [key: string]: Property } = {};
  public createdAt: Date;
  public updatedAt: Date;

  constructor(public classType?: string, elementId?: string) {
    this.id = elementId || \`PIG-\${uuidv4()}\`;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addProperty(prop: Property): void {
    this.properties[prop.name] = prop;
    this.updatedAt = new Date();
  }

  updateProperty(name: string, value: any): void {
    if (this.properties[name]) {
      this.properties[name].value = value;
      this.properties[name].validate();
      this.updatedAt = new Date();
    }
  }

  deleteProperty(name: string): void {
    delete this.properties[name];
    this.updatedAt = new Date();
  }

  static fromDict(data: any): PIGElement {
    const element = new PIGElement(data.classType, data.id);
    for (const name in data.properties) {
      element.addProperty(Property.fromDict(data.properties[name]));
    }
    return element;
  }

  toDict(): any {
    return {
      id: this.id,
      classType: this.classType,
      properties: Object.fromEntries(
        Object.entries(this.properties).map(([k, v]) => [k, v.toDict()])
      ),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

// --- Relationship Element with Class Constraints ---
export class PIGRelationship {
  public id: string;
  public createdAt: Date;

  constructor(
    public subjectId: string,
    public objectId: string,
    public relType: string,
    public allowedSubjectClasses: string[] = [],
    public allowedObjectClasses: string[] = [],
    relationshipId?: string
  ) {
    this.id = relationshipId || \`REL-\${uuidv4()}\`;
    this.createdAt = new Date();
  }

  validateClasses(subjectClass: string, objectClass: string): void {
    if (
      this.allowedSubjectClasses.length &&
      !this.allowedSubjectClasses.includes(subjectClass)
    ) {
      throw new Error(
        \`Invalid subject class '\${subjectClass}' for relationship type '\${this.relType}'\`
      );
    }
    if (
      this.allowedObjectClasses.length &&
      !this.allowedObjectClasses.includes(objectClass)
    ) {
      throw new Error(
        \`Invalid object class '\${objectClass}' for relationship type '\${this.relType}'\`
      );
    }
  }

  static fromDict(data: any): PIGRelationship {
    return new PIGRelationship(
      data.subject,
      data.object,
      data.type,
      data.allowedSubjectClasses,
      data.allowedObjectClasses,
      data.id
    );
  }

  toDict(): any {
    return {
      id: this.id,
      subject: this.subjectId,
      object: this.objectId,
      type: this.relType,
      allowedSubjectClasses: this.allowedSubjectClasses,
      allowedObjectClasses: this.allowedObjectClasses,
      createdAt: this.createdAt.toISOString()
    };
  }
}
