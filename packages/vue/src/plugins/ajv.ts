import { ajv } from '@cascara/common/lib/ajv';

export default {
    install(app: any) {
        // verfügbar als this.$ajv in Komponenten
        app.config.globalProperties.$ajv = ajv;
    }
};

export { ajv };
