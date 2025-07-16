import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

interface Element {
  class_type: string;
}

interface Relationship {
  id: string;
  subject: string;
  object: string;
  type: string;
  created_at: string;
  _auto_inverse_of?: string;
}

const elements: Record<string, Element> = {};
const relationships: Record<string, Relationship> = {};

const RELATIONSHIP_CLASS_CATALOG: Record<string, {
  allowed_subject_classes?: string[];
  allowed_object_classes?: string[];
  description?: string;
}> = {
  "parent_of": {
    allowed_subject_classes: ["Person"],
    allowed_object_classes: ["Person"],
    description: "Inverse of 'child_of'."
  },
  "child_of": {
    allowed_subject_classes: ["Person"],
    allowed_object_classes: ["Person"],
    description: "Inverse of 'parent_of'."
  }
};

app.post("/relationship", (req: Request, res: Response) => {
  const { subject, object, type } = req.body;

  if (!elements[subject] || !elements[object]) {
    return res.status(400).json({ error: "Invalid subject or object ID." });
  }

  const subjectClass = elements[subject].class_type;
  const objectClass = elements[object].class_type;

  const relDef = RELATIONSHIP_CLASS_CATALOG[type] || {};
  const allowedSubj = relDef.allowed_subject_classes || [];
  const allowedObj = relDef.allowed_object_classes || [];

  if (allowedSubj.length && !allowedSubj.includes(subjectClass)) {
    return res.status(400).json({ error: `Subject class '${subjectClass}' not allowed for relationship '${type}'` });
  }

  if (allowedObj.length && !allowedObj.includes(objectClass)) {
    return res.status(400).json({ error: `Object class '${objectClass}' not allowed for relationship '${type}'` });
  }

  const relId = `REL-${uuidv4()}`;
  relationships[relId] = {
    id: relId,
    subject,
    object,
    type,
    created_at: new Date().toISOString()
  };

  for (const [key, val] of Object.entries(RELATIONSHIP_CLASS_CATALOG)) {
    if (val.description?.startsWith("Inverse of '") && val.description?.endsWith(`'${type}'.`)) {
      const inverseType = key;
      const inverseDef = RELATIONSHIP_CLASS_CATALOG[inverseType];

      const invAllowedSubj = inverseDef.allowed_subject_classes || [];
      const invAllowedObj = inverseDef.allowed_object_classes || [];

      if (invAllowedSubj.length && !invAllowedSubj.includes(objectClass)) continue;
      if (invAllowedObj.length && !invAllowedObj.includes(subjectClass)) continue;

      const inverseId = `REL-${uuidv4()}`;
      relationships[inverseId] = {
        id: inverseId,
        subject: object,
        object: subject,
        type: inverseType,
        created_at: new Date().toISOString(),
        _auto_inverse_of: relId
      };
      break;
    }
  }

  return res.json(relationships[relId]);
});

app.delete("/relationship/:rel_id", (req: Request, res: Response) => {
  const relId = req.params.rel_id;
  const rel = relationships[relId];

  if (!rel) {
    return res.status(404).json({ error: "Relationship not found." });
  }

  delete relationships[relId];

  let inverseDeleted: string | null = null;
  for (const [rid, r] of Object.entries(relationships)) {
    if (r._auto_inverse_of === relId) {
      delete relationships[rid];
      inverseDeleted = rid;
      break;
    }
  }

  return res.json({ status: "deleted", relationship: relId, inverse_deleted: inverseDeleted });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
