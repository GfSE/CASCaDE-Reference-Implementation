import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// zentrale Ajv‑Instanz mit Formaten
const ajv = new Ajv({
    allErrors: true,
    coerceTypes: false
});
addFormats(ajv);

export { ajv };
