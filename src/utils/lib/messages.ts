/*!
 * Product Information Graph (PIG) - Centralized error and status messages
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) - Centralized error and status messages
*   Dependencies: none (self-contained)
*   Authors: oskar.dungern@gfse.org
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*
*   Design Decisions:
*   - All PIG validation and error messages centralized here
*   - Status codes 600-699 reserved for PIG-specific messages
*   - Messages are parameterized for flexibility
*   - Self-contained with IRsp definition to avoid circular dependencies
*   - Msg: for responses without payload (status/statusText only)
*   - Rsp: for responses with payload (response/responseType)
*   - Multi-language support: en, de, fr, es
*/

/** IRsp interface
 * An xhr-like object to return the result of the import;
 * use it as follows (according to GitHub Copilot):
 * - XML Document:
 *   const rspDoc: IRsp<Document> = { status: 200, statusText: 'OK', response: doc, responseType: 'document' };
 * - or JSON payload:
 *   type PigPackage = { /* ... * / };
 *   const rspJson: IRsp<PigPackage> = { status: 200, statusText: 'OK', response: pigPackage, responseType: 'json' };
 * - or dynamically:
 *   if (rsp.responseType === 'document') {
 *      const doc = rsp.response as Document;
 *   };
 */
// type XMLHttpRequestResponseType = "" | "arraybuffer" | "blob" | "document" | "json" | "text"
export interface IRsp<T = unknown> {
    status: number;
    statusText?: string;
    response?: T;
    responseType?: XMLHttpRequestResponseType;
    ok?: boolean;
}

export const rspOK: IRsp = { status: 0, statusText: 'ok', ok: true };

// Supported languages
export type LanguageCode = 'en' | 'de' | 'fr' | 'es';

/**
 * Language manager for error messages
 */
class Language {
    private currentLanguage: LanguageCode = 'en';

    /**
     * Set the language for error messages
     * @param lang - IETF language code (en, de, fr, es)
     */
    set(lang: string): void {
        const normalized = lang.toLowerCase().substring(0, 2) as LanguageCode;
        if (['en', 'de', 'fr', 'es'].includes(normalized)) {
            this.currentLanguage = normalized;
        } else {
            this.currentLanguage = 'en'; // fallback to English
        }
    }

    /**
     * Get the current message language
     */
    get(): LanguageCode {
        return this.currentLanguage;
    }
}
export const language = new Language();

// Type für Message-Funktionen - erlaubt beliebige Parameter, aber typsicher
type MessageFunction = (...args: (string | number | boolean)[]) => string;

// Message templates indexed by error code and language
const messages: Record<number, Record<LanguageCode, MessageFunction>> = {
    // Item validation (600-609)
    0: {
        en: () => 'OK',
        de: () => 'OK',
        fr: () => 'OK',
        es: () => 'OK'
    },
    600: {
        en: (fromType, toType) => 
            `Cannot change the itemType (tried to change from ${fromType} to ${toType})`,
        de: (fromType, toType) => 
            `Der itemType kann nicht geändert werden (Versuch von ${fromType} nach ${toType})`,
        fr: (fromType, toType) => 
            `Impossible de changer le itemType (tentative de ${fromType} vers ${toType})`,
        es: (fromType, toType) => 
            `No se puede cambiar el itemType (intento de ${fromType} a ${toType})`
    },
    601: {
        en: (itemType) => 
            `'${itemType}' must have a hasClass reference`,
        de: (itemType) => 
            `'${itemType}' muss eine hasClass-Referenz haben`,
        fr: (itemType) => 
            `'${itemType}' doit avoir une référence hasClass`,
        es: (itemType) => 
            `'${itemType}' debe tener una referencia hasClass`
    },

    // Identifiable validation
    602: {
        en: (fromId, toId) => 
            `Cannot change the id of an item (tried to change from ${fromId} to ${toId})`,
        de: (fromId, toId) => 
            `Die ID eines Elements kann nicht geändert werden (Versuch von ${fromId} nach ${toId})`,
        fr: (fromId, toId) => 
            `Impossible de changer l'id d'un élément (tentative de ${fromId} vers ${toId})`,
        es: (fromId, toId) => 
            `No se puede cambiar el id de un elemento (intento de ${fromId} a ${toId})`
    },
    603: {
        en: (fromSpec, toSpec) => 
            `Cannot change the specialization (tried to change from ${fromSpec} to ${toSpec})`,
        de: (fromSpec, toSpec) => 
            `Die Spezialisierung kann nicht geändert werden (Versuch von ${fromSpec} nach ${toSpec})`,
        fr: (fromSpec, toSpec) => 
            `Impossible de changer la spécialisation (tentative de ${fromSpec} vers ${toSpec})`,
        es: (fromSpec, toSpec) => 
            `No se puede cambiar la especialización (intento de ${fromSpec} a ${toSpec})`
    },

/*  currently not used:
    // ID validation (620-629)
    620: {
        en: (fieldName) => `${fieldName} is missing`,
        de: (fieldName) => `${fieldName} fehlt`,
        fr: (fieldName) => `${fieldName} est manquant`,
        es: (fieldName) => `${fieldName} falta`
    },
    621: {
        en: (fieldName) => `${fieldName} has no id`,
        de: (fieldName) => `${fieldName} hat keine id`,
        fr: (fieldName) => `${fieldName} n'a pas d'id`,
        es: (fieldName) => `${fieldName} no tiene id`
    },
    622: {
        en: (fieldName) => `${fieldName} has invalid type`,
        de: (fieldName) => `${fieldName} hat einen ungültigen Typ`,
        fr: (fieldName) => `${fieldName} a un type invalide`,
        es: (fieldName) => `${fieldName} tiene un tipo inválido`
    },
    624: {
        en: (fieldName) => `${fieldName} must be a non-empty string`,
        de: (fieldName) => `${fieldName} muss eine nicht-leere Zeichenkette sein`,
        fr: (fieldName) => `${fieldName} doit être une chaîne non vide`,
        es: (fieldName) => `${fieldName} debe ser una cadena no vacía`
    },
    625: {
        en: (fieldName) => 
            `${fieldName} must be a string with a term having a namespace or an URI`,
        de: (fieldName) => 
            `${fieldName} muss eine Zeichenkette mit einem Begriff mit Namensraum oder eine URI sein`,
        fr: (fieldName) => 
            `${fieldName} doit être une chaîne avec un terme ayant un espace de noms ou un URI`,
        es: (fieldName) => 
            `${fieldName} debe ser una cadena con un término que tenga un espacio de nombres o un URI`
    },
*/
    // Array validation (630-639)
    630: {
        en: (fieldName) => `${fieldName} must be an array`,
        de: (fieldName) => `${fieldName} muss ein Array sein`,
        fr: (fieldName) => `${fieldName} doit être un tableau`,
        es: (fieldName) => `${fieldName} debe ser un array`
    },
    631: {
        en: (fieldName, minCount) => 
            `${fieldName} must contain at least ${minCount} element(s)`,
        de: (fieldName, minCount) => 
            `${fieldName} muss mindestens ${minCount} Element(e) enthalten`,
        fr: (fieldName, minCount) => 
            `${fieldName} doit contenir au moins ${minCount} élément(s)`,
        es: (fieldName, minCount) => 
            `${fieldName} debe contener al menos ${minCount} elemento(s)`
    },
    632: {
        en: (fieldName, index) => 
            `${fieldName}[${index}] must be a valid id string`,
        de: (fieldName, index) => 
            `${fieldName}[${index}] muss eine gültige ID-Zeichenkette sein`,
        fr: (fieldName, index) => 
            `${fieldName}[${index}] doit être une chaîne d'id valide`,
        es: (fieldName, index) => 
            `${fieldName}[${index}] debe ser una cadena de id válida`
    },
    633: {
        en: (fieldName, index) => 
            `${fieldName}[${index}] must be an object with an 'id' or '@id' string`,
        de: (fieldName, index) => 
            `${fieldName}[${index}] muss ein Objekt mit einer 'id'- oder '@id'-Zeichenkette sein`,
        fr: (fieldName, index) => 
            `${fieldName}[${index}] doit être un objet avec une chaîne 'id' ou '@id'`,
        es: (fieldName, index) => 
            `${fieldName}[${index}] debe ser un objeto con una cadena 'id' o '@id'`
    },
    634: {
        en: (fieldName, index) => 
            `${fieldName}[${index}] must contain a valid 'id' or '@id' string`,
        de: (fieldName, index) => 
            `${fieldName}[${index}] muss eine gültige 'id'- oder '@id'-Zeichenkette enthalten`,
        fr: (fieldName, index) => 
            `${fieldName}[${index}] doit contenir une chaîne 'id' ou '@id' valide`,
        es: (fieldName, index) => 
            `${fieldName}[${index}] debe contener una cadena 'id' o '@id' válida`
    },
    635: {
        en: (fieldName, index) => 
            `${fieldName}[${index}] must be an id-object with a single 'id' or '@id' property`,
        de: (fieldName, index) => 
            `${fieldName}[${index}] muss ein ID-Objekt mit einer einzelnen 'id'- oder '@id'-Eigenschaft sein`,
        fr: (fieldName, index) => 
            `${fieldName}[${index}] doit être un objet-id avec une seule propriété 'id' ou '@id'`,
        es: (fieldName, index) => 
            `${fieldName}[${index}] debe ser un objeto-id con una única propiedad 'id' o '@id'`
    },

    // Multi-language text validation (640-649)
    640: {
        en: (fieldName) => 
            `Invalid ${fieldName}: expected an array of language-tagged texts`,
        de: (fieldName) => 
            `Ungültiges ${fieldName}: Array von sprachmarkierten Texten erwartet`,
        fr: (fieldName) => 
            `${fieldName} invalide: tableau de textes marqués par langue attendu`,
        es: (fieldName) => 
            `${fieldName} inválido: se espera un array de textos etiquetados por idioma`
    },
    641: {
        en: (fieldName) => 
            `Invalid ${fieldName} entry: expected object with string 'value'`,
        de: (fieldName) => 
            `Ungültiger ${fieldName}-Eintrag: Objekt mit Zeichenkette 'value' erwartet`,
        fr: (fieldName) => 
            `Entrée ${fieldName} invalide: objet avec chaîne 'value' attendu`,
        es: (fieldName) => 
            `Entrada ${fieldName} inválida: se espera objeto con cadena 'value'`
    },
    642: {
        en: (fieldName) => 
            `Invalid ${fieldName} entry: 'lang' must be a string when present`,
        de: (fieldName) => 
            `Ungültiger ${fieldName}-Eintrag: 'lang' muss, falls vorhanden, eine Zeichenkette sein`,
        fr: (fieldName) => 
            `Entrée ${fieldName} invalide: 'lang' doit être une chaîne si présent`,
        es: (fieldName) => 
            `Entrada ${fieldName} inválida: 'lang' debe ser una cadena cuando esté presente`
    },
    643: {
        en: (fieldName, index) => 
            `Invalid ${fieldName}[${index}]: expected object with 'value' and 'lang'`,
        de: (fieldName, index) => 
            `Ungültiger ${fieldName}[${index}]: Objekt mit 'value' und 'lang' erwartet`,
        fr: (fieldName, index) => 
            `Entrée ${fieldName}[${index}] invalide: objet avec 'value' et 'lang' attendu`,
        es: (fieldName, index) => 
            `Entrada ${fieldName}[${index}] inválida: se espera objeto con 'value' y 'lang'`
    },
    644: {
        en: (fieldName, index) => 
            `Invalid ${fieldName}[${index}]: 'value' must be a string`,
        de: (fieldName, index) => 
            `Ungültiger ${fieldName}[${index}]: 'value' muss eine Zeichenkette sein`,
        fr: (fieldName, index) => 
            `Entrée ${fieldName}[${index}]: 'value' doit être une chaîne`,
        es: (fieldName, index) => 
            `Entrada ${fieldName}[${index}]: 'value' debe ser una cadena`
    },
    645: {
        en: (fieldName, index) => 
            `Invalid ${fieldName}[${index}]: 'lang' must be a non-empty string`,
        de: (fieldName, index) => 
            `Ungültiger ${fieldName}[${index}]: 'lang' muss eine nicht-leere Zeichenkette sein`,
        fr: (fieldName, index) => 
            `Entrée ${fieldName}[${index}]: 'lang' doit être une chaîne non vide`,
        es: (fieldName, index) => 
            `Entrada ${fieldName}[${index}]: 'lang' debe ser una cadena no vacía`
    },

    // Item instantiation and validation (650-659)
    650: {
        en: (op, field, id) => `${op}: Missing required field "${field}" in item with id "${id}"`,
        de: (op, field, id) => `${op}: Pflichtfeld "${field}" fehlt bei Item mit ID "${id}"`,
        fr: (op, field, id) => `${op}: Champ obligatoire "${field}" manquant dans l'élément avec id "${id}"`,
        es: (op, field, id) => `${op}: Falta el campo obligatorio "${field}" en el elemento con id "${id}"`
    },

    651: {
        en: (op, field) => `${op}: Item type "${field}" is not allowed in package graph`,
        de: (op, field) => `${op}: Elementtyp "${field}" ist im Package-Graph nicht erlaubt`,
        fr: (op, field) => `${op}: Le type d'élément "${field}" n'est pas autorisé dans le graphe de package`,
        es: (op, field) => `${op}: El tipo de elemento "${field}" no está permitido en el grafo del paquete`
    },

    652: {
        en: (op, field) => `${op}: Unable to create instance for itemType "${field}"`,
        de: (op, field) => `${op}: Instanz für itemType "${field}" kann nicht erstellt werden`,
        fr: (op, field) => `${op}: Impossible de créer une instance pour itemType "${field}"`,
        es: (op, field) => `${op}: No se puede crear una instancia para itemType "${field}"`
    },

    653: {
        en: (op, field, id) => `${op}: Validation failed for ${field} with id "${id}"`,
        de: (op, field, id) => `${op}: Validierung fehlgeschlagen für ${field} mit ID "${id}"`,
        fr: (op, field, id) => `${op}: Échec de validation pour ${field} avec id "${id}"`,
        es: (op, field, id) => `${op}: Falló la validación para ${field} con id "${id}"`
    },

    654: {
        en: (op, field, err) => `${op}: Failed to instantiate ${field}: ${err}`,
        de: (op, field, err) => `${op}: Instanziierung von ${field} fehlgeschlagen: ${err}`,
        fr: (op, field, err) => `${op}: Échec d'instanciation de ${field}: ${err}`,
        es: (op, field, err) => `${op}: Fallo al instanciar ${field}: ${err}`
    },

    // Import and Transformation (660-669)
    660: {
        en: (format, msg) => `Failed to transform ${format}: ${msg}`,
        de: (format, msg) => `Transformation von ${format} fehlgeschlagen: ${msg}`,
        fr: (format, msg) => `Échec de transformation ${format}: ${msg}`,
        es: (format, msg) => `Error al transformar ${format}: ${msg}`
    },

    // Package constraint validation (670-679)
    670: {
        en: (index) =>
            `Package validation failed: item at index ${index} is missing id`,
        de: (index) =>
            `Paket-Validierung fehlgeschlagen: Element mit Index ${index} hat keine id`,
        fr: (index) =>
            `Échec de la validation du package: élément à l'index ${index} n'a pas d'id`,
        es: (index) =>
            `Error en la validación del paquete: elemento en índice ${index} no tiene id`
    },
    671: {
        en: (id, firstIndex, secondIndex) =>
            `Package validation failed: duplicate ID '${id}' found at indices ${firstIndex} and ${secondIndex}`,
        de: (id, firstIndex, secondIndex) =>
            `Paket-Validierung fehlgeschlagen: doppelte ID '${id}' bei Indizes ${firstIndex} und ${secondIndex} gefunden`,
        fr: (id, firstIndex, secondIndex) =>
            `Échec de la validation du package: ID dupliqué '${id}' trouvé aux indices ${firstIndex} et ${secondIndex}`,
        es: (id, firstIndex, secondIndex) =>
            `Error en la validación del paquete: ID duplicado '${id}' encontrado en índices ${firstIndex} y ${secondIndex}`
    },
    672: {
        en: (parentId, propIndex, msg) =>
            `Package validation failed: item '${parentId}' hasProperty[${propIndex}] has ${msg}`,
        de: (parentId, propIndex, msg) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' hasProperty[${propIndex}] hat ${msg}`,
        fr: (parentId, propIndex, msg) =>
            `Échec de la validation du package: élément '${parentId}' hasProperty[${propIndex}] a ${msg}`,
        es: (parentId, propIndex, msg) =>
            `Error en la validación del paquete: elemento '${parentId}' hasProperty[${propIndex}] tiene ${msg}`
    },
    673: {
        en: (parentId, propIndex, hasClass, msg) =>
            `Package validation failed: item '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        de: (parentId, propIndex, hasClass, msg) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        fr: (parentId, propIndex, hasClass, msg) =>
            `Échec de la validation du package: élément '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        es: (parentId, propIndex, hasClass, msg) =>
            `Error en la validación del paquete: elemento '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`
    },
    674: {
        en: (parentId, index, prpName, msg) =>
            `Package validation failed: item '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        de: (parentId, index, prpName, msg) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        fr: (parentId, index, prpName, msg) =>
            `Échec de la validation du package: élément '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        es: (parentId, index, prpName, msg) =>
            `Error en la validación del paquete: elemento '${parentId}' graph[${index}] ${prpName} - ${msg}`
    },
    675: {
        en: (parentId, index, prpName, prpVal, msg) =>
            `Package validation failed: item '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        de: (parentId, index, prpName, prpVal, msg) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        fr: (parentId, index, prpName, prpVal, msg) =>
            `Échec de la validation du package: élément '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        es: (parentId, index, prpName, prpVal, msg) =>
            `Error en la validación del paquete: elemento '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`
    },
    679: {
        en: (op, act, exp) =>
            `${op}: Created ${act} of ${exp} graph items`,
        de: (op, act, exp) =>
            `${op}: ${act} von ${exp} Graph-Elementen erstellt`,
        fr: (op, act, exp) =>
            `${op}: ${act} éléments de graphe créés sur ${exp}`,
        es: (op, act, exp) =>
            `${op}: Se crearon ${act} de ${exp} elementos del grafo`
    },

    // Schema validation (680-689)
    680: {
        en: (id, datatype) =>
            `Property '${id}' has unsupported datatype '${datatype}'. It will be treated as 'xs:string'.`,
        de: (id, datatype) =>
            `Eigenschaft '${id}' hat nicht unterstützten Datentyp '${datatype}'. Sie wird als 'xs:string' behandelt.`,
        fr: (id, datatype) =>
            `La propriété '${id}' a un type de données non supporté '${datatype}'. Elle sera traitée comme 'xs:string'.`,
        es: (id, datatype) =>
            `La propiedad '${id}' tiene un tipo de datos no soportado '${datatype}'. Se tratará como 'xs:string'.`
    },
    681: {
        en: (itemType, id, msg) =>
            `Schema validation failed for ${itemType} '${id}': ${msg}`,
        de: (itemType, id, msg) =>
            `Schema-Validierung fehlgeschlagen für ${itemType} '${id}': ${msg}`,
        fr: (itemType, id, msg) =>
            `Échec de la validation du schéma pour ${itemType} '${id}': ${msg}`,
        es: (itemType, id, msg) =>
            `Falló la validación del esquema para ${itemType} '${id}': ${msg}`
    },
    682: {
        en: (itemType, id, msg) =>
            `Schema validation error for ${itemType} '${id}': ${msg}`,
        de: (itemType, id, msg) =>
            `Schema-Validierungsfehler für ${itemType} '${id}': ${msg}`,
        fr: (itemType, id, msg) =>
            `Erreur de validation du schéma pour ${itemType} '${id}': ${msg}`,
        es: (itemType, id, msg) =>
            `Error de validación del esquema para ${itemType} '${id}': ${msg}`
    },

    // General errors (690-699)
    690: {
        en: (format, msg) => `Failed to parse ${format}: ${msg}`,
        de: (format, msg) => `Parsing von ${format} fehlgeschlagen: ${msg}`,
        fr: (format, msg) => `Échec de l'analyse ${format}: ${msg}`,
        es: (format, msg) => `Error al analizar ${format}: ${msg}`
    },
    691: {
        en: (format, created, total) =>
            `Imported ${created} of ${total} items from ${format}`,
        de: (format, created, total) =>
            `${created} von ${total} Elementen aus ${format} importiert`,
        fr: (format, created, total) =>
            `${created} éléments sur ${total} importés depuis ${format}`,
        es: (format, created, total) =>
            `${created} de ${total} elementos importados desde ${format}`
    },
    692: {
        en: (url, statusText) =>
            `Failed to fetch URL ${url}: ${statusText}`,
        de: (url, statusText) =>
            `Fehler beim Abrufen der URL ${url}: ${statusText}`,
        fr: (url, statusText) =>
            `Échec de la récupération de l'URL ${url}: ${statusText}`,
        es: (url, statusText) =>
            `Error al obtener la URL ${url}: ${statusText}`
    },
    693: {
        en: (source, msg) =>
            `Network error fetching ${source}: ${msg}`,
        de: (source, msg) =>
            `Netzwerkfehler beim Abrufen von ${source}: ${msg}`,
        fr: (source, msg) =>
            `Erreur réseau lors de la récupération de ${source}: ${msg}`,
        es: (source, msg) =>
            `Error de red al obtener ${source}: ${msg}`
    },
    694: {
        en: (source, msg) =>
            `Failed to read file` + (source ? ` '${source}'` : '') + `: ${msg}`,
        de: (source, msg) =>
            `Fehler beim Lesen der Datei` + (source ? ` '${source}'` : '') + `: ${msg}`,
        fr: (source, msg) =>
            `Échec de la lecture du fichier` + (source ? ` '${source}'` : '') + `: ${msg}`,
        es: (source, msg) =>
            `Error al leer el archivo` + (source ? ` '${source}'` : ``) + `: ${msg}`
    },
    695: {
        en: () =>
            `String source provided but not an http(s) URL and not running in Node.`,
        de: () =>
            `String-Quelle angegeben, aber keine http(s)-URL und nicht in Node-Umgebung.`,
        fr: () =>
            `Source de type chaîne fournie mais pas une URL http(s) et pas dans Node.`,
        es: () =>
            `Fuente de cadena proporcionada pero no es una URL http(s) y no se ejecuta en Node.`
    },
    696: {
        en: () =>
            `Unsupported source type when reading a file as text`,
        de: () =>
            `Nicht unterstützter Quelltyp beim Lesen einer Datei als Text`,
        fr: () =>
            `Type de source non pris en charge lors de la lecture d'un fichier en tant que texte`,
        es: () =>
            `Tipo de fuente no compatible al leer un archivo como texto`
    },
    697: {
        en: (format, errors) =>
            `${format} package validation failed: ${errors}`,
        de: (format, errors) =>
            `${format} Paket-Validierung fehlgeschlagen: ${errors}`,
        fr: (format, errors) =>
            `Échec de la validation du package ${format}: ${errors}`,
        es: (format, errors) =>
            `Error en la validación del paquete ${format}: ${errors}`
    },
    698: {
        en: (func) => `${func} not yet implemented`,
        de: (func) => `${func} ist noch nicht implementiert`,
        fr: (func) => `${func} pas encore implémenté`,
        es: (func) => `${func} aún no implementado`
    },
    699: {
        en: (msg) => msg.toString(),
        de: (msg) => msg.toString(),
        fr: (msg) => msg.toString(),
        es: (msg) => msg.toString()
    }
};

/**
 * Get message in current language with fallback to English
 */
function getMessage(code: number, ...args: (string | number | boolean)[]): string {
    const msgTemplate = messages[code];
    if (!msgTemplate) {
        return `Unknown error code ${code}`;
    }
    
    // Try current language, fallback to English
    const msgFn = msgTemplate[language.get()] || msgTemplate['en'];
    return msgFn ? msgFn(...args) : `Unknown error code ${code}`;
}

/*!
 * Messages and Responses
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * Messages and Responses
 * Use for validation errors and status messages
 */
export class Msg {
    /**
     * Create a message response with error code and parameters
     * @param code - Error code (600-699 for PIG-specific errors)
     * @param args - Parameters for the message template
     */
    static create(code: number, ...args: (string | number | boolean)[]): IRsp {
        return {
            status: code,
            statusText: getMessage(code, ...args),
            ok: code > 199 && code < 300 || code === 0
        };
    }
}

/**
 * Rsp - Create IRsp with response payload
 * Use for successful operations that return data
 */
export class Rsp {
    /**
     * Create a response with error code, parameters, and payload
     * @param code - Status code (600-699 for PIG-specific errors, 200-299 for success)
     * @param response - Response payload
     * @param responseType - Type of response (e.g., 'json', 'document', 'text')
     * @param args - Parameters for the message template (if code has a message)
     */
    static create<T = unknown>(
        code: number,
        response: T,
        responseType?: XMLHttpRequestResponseType,
        ...args: (string | number | boolean)[]
    ): IRsp<T> {
        return {
            status: code,
            statusText: getMessage(code, ...args),
            response,
            responseType,
            ok: code > 199 && code < 300 || code === 0
        };
    }
}
