import type Ajv from 'ajv';

declare module '@vue/runtime-core' {
    // ermöglicht in Komponenten den Zugriff auf this.$ajv
    interface ComponentCustomProperties {
        $ajv: Ajv;
    }
}

export {};
