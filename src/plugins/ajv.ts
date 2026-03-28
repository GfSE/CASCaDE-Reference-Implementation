import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// zentrale Ajv‑Instanz mit Formaten
const ajv = new Ajv({ allErrors: true, coerceTypes: false });
addFormats(ajv);

export default {
    install(app: any) {
        // verfügbar als this.$ajv in Komponenten
        app.config.globalProperties.$ajv = ajv;
    }
};

// zusätzliches Named‑Export falls direkter Import bevorzugt wird
export { ajv };
