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

// Message templates indexed by error code and language
const messages: Record<number, Record<LanguageCode, (...args: any[]) => string>> = {
    // Item validation (600-609)
    0: {
        en: () => 'OK',
        de: () => 'OK',
        fr: () => 'OK',
        es: () => 'OK'
    },
    600: {
        en: (fromType: string, toType: string) => 
            `Cannot change the itemType (tried to change from ${fromType} to ${toType})`,
        de: (fromType: string, toType: string) => 
            `Der itemType kann nicht geändert werden (Versuch von ${fromType} nach ${toType})`,
        fr: (fromType: string, toType: string) => 
            `Impossible de changer le itemType (tentative de ${fromType} vers ${toType})`,
        es: (fromType: string, toType: string) => 
            `No se puede cambiar el itemType (intento de ${fromType} a ${toType})`
    },
    601: {
        en: (itemType: string) => 
            `'${itemType}' must have a hasClass reference`,
        de: (itemType: string) => 
            `'${itemType}' muss eine hasClass-Referenz haben`,
        fr: (itemType: string) => 
            `'${itemType}' doit avoir une référence hasClass`,
        es: (itemType: string) => 
            `'${itemType}' debe tener una referencia hasClass`
    },

    // Identifiable validation
    602: {
        en: (fromId: string, toId: string) => 
            `Cannot change the id of an item (tried to change from ${fromId} to ${toId})`,
        de: (fromId: string, toId: string) => 
            `Die ID eines Elements kann nicht geändert werden (Versuch von ${fromId} nach ${toId})`,
        fr: (fromId: string, toId: string) => 
            `Impossible de changer l'id d'un élément (tentative de ${fromId} vers ${toId})`,
        es: (fromId: string, toId: string) => 
            `No se puede cambiar el id de un elemento (intento de ${fromId} a ${toId})`
    },
    603: {
        en: (fromSpec: string, toSpec: string) => 
            `Cannot change the specialization (tried to change from ${fromSpec} to ${toSpec})`,
        de: (fromSpec: string, toSpec: string) => 
            `Die Spezialisierung kann nicht geändert werden (Versuch von ${fromSpec} nach ${toSpec})`,
        fr: (fromSpec: string, toSpec: string) => 
            `Impossible de changer la spécialisation (tentative de ${fromSpec} vers ${toSpec})`,
        es: (fromSpec: string, toSpec: string) => 
            `No se puede cambiar la especialización (intento de ${fromSpec} a ${toSpec})`
    },

    // ID validation (620-629)
    620: {
        en: (fieldName: string) => `${fieldName} is missing`,
        de: (fieldName: string) => `${fieldName} fehlt`,
        fr: (fieldName: string) => `${fieldName} est manquant`,
        es: (fieldName: string) => `${fieldName} falta`
    },
    621: {
        en: (fieldName: string) => `${fieldName} has no id`,
        de: (fieldName: string) => `${fieldName} hat keine id`,
        fr: (fieldName: string) => `${fieldName} n'a pas d'id`,
        es: (fieldName: string) => `${fieldName} no tiene id`
    },
    622: {
        en: (fieldName: string) => `${fieldName} has invalid type`,
        de: (fieldName: string) => `${fieldName} hat einen ungültigen Typ`,
        fr: (fieldName: string) => `${fieldName} a un type invalide`,
        es: (fieldName: string) => `${fieldName} tiene un tipo inválido`
    },
    623: {
        en: (fieldName: string) => `${fieldName} is missing id`,
        de: (fieldName: string) => `${fieldName} fehlt die ID`,
        fr: (fieldName: string) => `${fieldName} manque l'id`,
        es: (fieldName: string) => `${fieldName} falta el id`
    },
    624: {
        en: (fieldName: string) => `${fieldName} must be a non-empty string`,
        de: (fieldName: string) => `${fieldName} muss eine nicht-leere Zeichenkette sein`,
        fr: (fieldName: string) => `${fieldName} doit être une chaîne non vide`,
        es: (fieldName: string) => `${fieldName} debe ser una cadena no vacía`
    },
    625: {
        en: (fieldName: string) => 
            `${fieldName} must be a string with a term having a namespace or an URI`,
        de: (fieldName: string) => 
            `${fieldName} muss eine Zeichenkette mit einem Begriff mit Namensraum oder eine URI sein`,
        fr: (fieldName: string) => 
            `${fieldName} doit être une chaîne avec un terme ayant un espace de noms ou un URI`,
        es: (fieldName: string) => 
            `${fieldName} debe ser una cadena con un término que tenga un espacio de nombres o un URI`
    },

    // Array validation (630-639)
    630: {
        en: (fieldName: string) => `${fieldName} must be an array`,
        de: (fieldName: string) => `${fieldName} muss ein Array sein`,
        fr: (fieldName: string) => `${fieldName} doit être un tableau`,
        es: (fieldName: string) => `${fieldName} debe ser un array`
    },
    631: {
        en: (fieldName: string, minCount: number) => 
            `${fieldName} must contain at least ${minCount} element(s)`,
        de: (fieldName: string, minCount: number) => 
            `${fieldName} muss mindestens ${minCount} Element(e) enthalten`,
        fr: (fieldName: string, minCount: number) => 
            `${fieldName} doit contenir au moins ${minCount} élément(s)`,
        es: (fieldName: string, minCount: number) => 
            `${fieldName} debe contener al menos ${minCount} elemento(s)`
    },
    632: {
        en: (fieldName: string, index: number) => 
            `${fieldName}[${index}] must be a valid id string`,
        de: (fieldName: string, index: number) => 
            `${fieldName}[${index}] muss eine gültige ID-Zeichenkette sein`,
        fr: (fieldName: string, index: number) => 
            `${fieldName}[${index}] doit être une chaîne d'id valide`,
        es: (fieldName: string, index: number) => 
            `${fieldName}[${index}] debe ser una cadena de id válida`
    },
    633: {
        en: (fieldName: string, index: number) => 
            `${fieldName}[${index}] must be an object with an 'id' or '@id' string`,
        de: (fieldName: string, index: number) => 
            `${fieldName}[${index}] muss ein Objekt mit einer 'id'- oder '@id'-Zeichenkette sein`,
        fr: (fieldName: string, index: number) => 
            `${fieldName}[${index}] doit être un objet avec une chaîne 'id' ou '@id'`,
        es: (fieldName: string, index: number) => 
            `${fieldName}[${index}] debe ser un objeto con una cadena 'id' o '@id'`
    },
    634: {
        en: (fieldName: string, index: number) => 
            `${fieldName}[${index}] must contain a valid 'id' or '@id' string`,
        de: (fieldName: string, index: number) => 
            `${fieldName}[${index}] muss eine gültige 'id'- oder '@id'-Zeichenkette enthalten`,
        fr: (fieldName: string, index: number) => 
            `${fieldName}[${index}] doit contenir une chaîne 'id' ou '@id' valide`,
        es: (fieldName: string, index: number) => 
            `${fieldName}[${index}] debe contener una cadena 'id' o '@id' válida`
    },
    635: {
        en: (fieldName: string, index: number) => 
            `${fieldName}[${index}] must be an id-object with a single 'id' or '@id' property`,
        de: (fieldName: string, index: number) => 
            `${fieldName}[${index}] muss ein ID-Objekt mit einer einzelnen 'id'- oder '@id'-Eigenschaft sein`,
        fr: (fieldName: string, index: number) => 
            `${fieldName}[${index}] doit être un objet-id avec une seule propriété 'id' ou '@id'`,
        es: (fieldName: string, index: number) => 
            `${fieldName}[${index}] debe ser un objeto-id con una única propiedad 'id' o '@id'`
    },

    // Multi-language text validation (640-649)
    640: {
        en: (fieldName: string) => 
            `Invalid ${fieldName}: expected an array of language-tagged texts`,
        de: (fieldName: string) => 
            `Ungültiges ${fieldName}: Array von sprachmarkierten Texten erwartet`,
        fr: (fieldName: string) => 
            `${fieldName} invalide: tableau de textes marqués par langue attendu`,
        es: (fieldName: string) => 
            `${fieldName} inválido: se espera un array de textos etiquetados por idioma`
    },
    641: {
        en: (fieldName: string) => 
            `Invalid ${fieldName} entry: expected object with string 'value'`,
        de: (fieldName: string) => 
            `Ungültiger ${fieldName}-Eintrag: Objekt mit Zeichenkette 'value' erwartet`,
        fr: (fieldName: string) => 
            `Entrée ${fieldName} invalide: objet avec chaîne 'value' attendu`,
        es: (fieldName: string) => 
            `Entrada ${fieldName} inválida: se espera objeto con cadena 'value'`
    },
    642: {
        en: (fieldName: string) => 
            `Invalid ${fieldName} entry: 'lang' must be a string when present`,
        de: (fieldName: string) => 
            `Ungültiger ${fieldName}-Eintrag: 'lang' muss, falls vorhanden, eine Zeichenkette sein`,
        fr: (fieldName: string) => 
            `Entrée ${fieldName} invalide: 'lang' doit être une chaîne si présent`,
        es: (fieldName: string) => 
            `Entrada ${fieldName} inválida: 'lang' debe ser una cadena cuando esté presente`
    },
    643: {
        en: (fieldName: string, index: number) => 
            `Invalid ${fieldName}[${index}]: expected object with 'value' and 'lang'`,
        de: (fieldName: string, index: number) => 
            `Ungültiger ${fieldName}[${index}]: Objekt mit 'value' und 'lang' erwartet`,
        fr: (fieldName: string, index: number) => 
            `Entrée ${fieldName}[${index}] invalide: objet avec 'value' et 'lang' attendu`,
        es: (fieldName: string, index: number) => 
            `Entrada ${fieldName}[${index}] inválida: se espera objeto con 'value' y 'lang'`
    },
    644: {
        en: (fieldName: string, index: number) => 
            `Invalid ${fieldName}[${index}]: 'value' must be a string`,
        de: (fieldName: string, index: number) => 
            `Ungültiger ${fieldName}[${index}]: 'value' muss eine Zeichenkette sein`,
        fr: (fieldName: string, index: number) => 
            `Entrée ${fieldName}[${index}]: 'value' doit être une chaîne`,
        es: (fieldName: string, index: number) => 
            `Entrada ${fieldName}[${index}]: 'value' debe ser una cadena`
    },
    645: {
        en: (fieldName: string, index: number) => 
            `Invalid ${fieldName}[${index}]: 'lang' must be a non-empty string`,
        de: (fieldName: string, index: number) => 
            `Ungültiger ${fieldName}[${index}]: 'lang' muss eine nicht-leere Zeichenkette sein`,
        fr: (fieldName: string, index: number) => 
            `Entrée ${fieldName}[${index}]: 'lang' doit être une chaîne non vide`,
        es: (fieldName: string, index: number) => 
            `Entrada ${fieldName}[${index}]: 'lang' debe ser una cadena no vacía`
    },

    // Item instantiation and validation (650-659)
    650: {
        en: (op: string, field: string, id: string) => `${op}: Missing required field "${field}" in item with id "${id}"`,
        de: (op: string, field: string, id: string) => `${op}: Pflichtfeld "${field}" fehlt bei Item mit ID "${id}"`,
        fr: (op: string, field: string, id: string) => `${op}: Champ obligatoire "${field}" manquant dans l'élément avec id "${id}"`,
        es: (op: string, field: string, id: string) => `${op}: Falta el campo obligatorio "${field}" en el elemento con id "${id}"`
    },

    651: {
        en: (op: string, field: string) => `${op}: Item type "${field}" is not allowed in package graph`,
        de: (op: string, field: string) => `${op}: Elementtyp "${field}" ist im Package-Graph nicht erlaubt`,
        fr: (op: string, field: string) => `${op}: Le type d'élément "${field}" n'est pas autorisé dans le graphe de package`,
        es: (op: string, field: string) => `${op}: El tipo de elemento "${field}" no está permitido en el grafo del paquete`
    },

    652: {
        en: (op: string, field: string) => `${op}: Unable to create instance for itemType "${field}"`,
        de: (op: string, field: string) => `${op}: Instanz für itemType "${field}" kann nicht erstellt werden`,
        fr: (op: string, field: string) => `${op}: Impossible de créer une instance pour itemType "${field}"`,
        es: (op: string, field: string) => `${op}: No se puede crear una instancia para itemType "${field}"`
    },

    653: {
        en: (op: string, field: string, id: string) => `${op}: Validation failed for ${field} with id "${id}"`,
        de: (op: string, field: string, id: string) => `${op}: Validierung fehlgeschlagen für ${field} mit ID "${id}"`,
        fr: (op: string, field: string, id: string) => `${op}: Échec de validation pour ${field} avec id "${id}"`,
        es: (op: string, field: string, id: string) => `${op}: Falló la validación para ${field} con id "${id}"`
    },

    654: {
        en: (op: string, field: string, err: string) => `${op}: Failed to instantiate ${field}: ${err}`,
        de: (op: string, field: string, err: string) => `${op}: Instanziierung von ${field} fehlgeschlagen: ${err}`,
        fr: (op: string, field: string, err: string) => `${op}: Échec d'instanciation de ${field}: ${err}`,
        es: (op: string, field: string, err: string) => `${op}: Fallo al instanciar ${field}: ${err}`
    },

    // Package constraint validation (670-679)
    670: {
        en: (index: number) =>
            `Package validation failed: item at index ${index} is missing id`,
        de: (index: number) =>
            `Paket-Validierung fehlgeschlagen: Element mit Index ${index} hat keine id`,
        fr: (index: number) =>
            `Échec de la validation du package: élément à l'index ${index} n'a pas d'id`,
        es: (index: number) =>
            `Error en la validación del paquete: elemento en índice ${index} no tiene id`
    },
    671: {
        en: (id: string, firstIndex: number, secondIndex: number) =>
            `Package validation failed: duplicate ID '${id}' found at indices ${firstIndex} and ${secondIndex}`,
        de: (id: string, firstIndex: number, secondIndex: number) =>
            `Paket-Validierung fehlgeschlagen: doppelte ID '${id}' bei Indizes ${firstIndex} und ${secondIndex} gefunden`,
        fr: (id: string, firstIndex: number, secondIndex: number) =>
            `Échec de la validation du package: ID dupliqué '${id}' trouvé aux indices ${firstIndex} et ${secondIndex}`,
        es: (id: string, firstIndex: number, secondIndex: number) =>
            `Error en la validación del paquete: ID duplicado '${id}' encontrado en índices ${firstIndex} y ${secondIndex}`
    },
    672: {
        en: (parentId: string, propIndex: number, msg: string) =>
            `Package validation failed: item '${parentId}' hasProperty[${propIndex}] has ${msg}`,
        de: (parentId: string, propIndex: number, msg: string) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' hasProperty[${propIndex}] hat ${msg}`,
        fr: (parentId: string, propIndex: number, msg: string) =>
            `Échec de la validation du package: élément '${parentId}' hasProperty[${propIndex}] a ${msg}`,
        es: (parentId: string, propIndex: number, msg: string) =>
            `Error en la validación del paquete: elemento '${parentId}' hasProperty[${propIndex}] tiene ${msg}`
    },
    673: {
        en: (parentId: string, propIndex: number, hasClass: string, msg: string) =>
            `Package validation failed: item '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        de: (parentId: string, propIndex: number, hasClass: string, msg: string) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        fr: (parentId: string, propIndex: number, hasClass: string, msg: string) =>
            `Échec de la validation du package: élément '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`,
        es: (parentId: string, propIndex: number, hasClass: string, msg: string) =>
            `Error en la validación del paquete: elemento '${parentId}' hasProperty[${propIndex}].hasClass='${hasClass}' - ${msg}`
    },
    674: {
        en: (parentId: string, index: number, prpName: string, msg: string) =>
            `Package validation failed: item '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        de: (parentId: string, index: number, prpName: string, msg: string) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        fr: (parentId: string, index: number, prpName: string, msg: string) =>
            `Échec de la validation du package: élément '${parentId}' graph[${index}] ${prpName} - ${msg}`,
        es: (parentId: string, index: number, prpName: string, msg: string) =>
            `Error en la validación del paquete: elemento '${parentId}' graph[${index}] ${prpName} - ${msg}`
    },
    675: {
        en: (parentId: string, index: number, prpName: string, prpVal: string, msg: string) =>
            `Package validation failed: item '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        de: (parentId: string, index: number, prpName: string, prpVal: string, msg: string) =>
            `Paket-Validierung fehlgeschlagen: Element '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        fr: (parentId: string, index: number, prpName: string, prpVal: string, msg: string) =>
            `Échec de la validation du package: élément '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`,
        es: (parentId: string, index: number, prpName: string, prpVal: string, msg: string) =>
            `Error en la validación del paquete: elemento '${parentId}' graph[${index}] ${prpName}: ${prpVal} - ${msg}`
    },
    679: {
        en: (op: string, act: number, exp: number) =>
            `${op}: Created ${act} of ${exp} graph items`,
        de: (op: string, act: number, exp: number) =>
            `${op}: ${act} von ${exp} Graph-Elementen erstellt`,
        fr: (op: string, act: number, exp: number) =>
            `${op}: ${act} éléments de graphe créés sur ${exp}`,
        es: (op: string, act: number, exp: number) =>
            `${op}: Se crearon ${act} de ${exp} elementos del grafo`
    },

    // Schema validation (680-689)
    680: {
        en: (id: string, datatype: string) =>
            `Property '${id}' has unsupported datatype '${datatype}'. It will be treated as 'xs:string'.`,
        de: (id: string, datatype: string) =>
            `Eigenschaft '${id}' hat nicht unterstützten Datentyp '${datatype}'. Sie wird als 'xs:string' behandelt.`,
        fr: (id: string, datatype: string) =>
            `La propriété '${id}' a un type de données non supporté '${datatype}'. Elle sera traitée comme 'xs:string'.`,
        es: (id: string, datatype: string) =>
            `La propiedad '${id}' tiene un tipo de datos no soportado '${datatype}'. Se tratará como 'xs:string'.`
    },
    681: {
        en: (itemType: string, id: string, msg: string) =>
            `Schema validation failed for ${itemType} '${id}': ${msg}`,
        de: (itemType: string, id: string, msg: string) =>
            `Schema-Validierung fehlgeschlagen für ${itemType} '${id}': ${msg}`,
        fr: (itemType: string, id: string, msg: string) =>
            `Échec de la validation du schéma pour ${itemType} '${id}': ${msg}`,
        es: (itemType: string, id: string, msg: string) =>
            `Falló la validación del esquema para ${itemType} '${id}': ${msg}`
    },
    682: {
        en: (itemType: string, id: string, msg: string) =>
            `Schema validation error for ${itemType} '${id}': ${msg}`,
        de: (itemType: string, id: string, msg: string) =>
            `Schema-Validierungsfehler für ${itemType} '${id}': ${msg}`,
        fr: (itemType: string, id: string, msg: string) =>
            `Erreur de validation du schéma pour ${itemType} '${id}': ${msg}`,
        es: (itemType: string, id: string, msg: string) =>
            `Error de validación del esquema para ${itemType} '${id}': ${msg}`
    },

    // General errors (690-699)
    690: {
        en: (format: string, msg: string) => `Failed to parse ${format}: ${msg}`,
        de: (format: string, msg: string) => `Parsing von ${format} fehlgeschlagen: ${msg}`,
        fr: (format: string, msg: string) => `Échec de l'analyse ${format}: ${msg}`,
        es: (format: string, msg: string) => `Error al analizar ${format}: ${msg}`
    },
    691: {
        en: (format: string, created: number, total: number) =>
            `Imported ${created} of ${total} items from ${format}`,
        de: (format: string, created: number, total: number) =>
            `${created} von ${total} Elementen aus ${format} importiert`,
        fr: (format: string, created: number, total: number) =>
            `${created} éléments sur ${total} importés depuis ${format}`,
        es: (format: string, created: number, total: number) =>
            `${created} de ${total} elementos importados desde ${format}`
    },
    692: {
        en: (url: string, statusText: string) =>
            `Failed to fetch URL ${url}: ${statusText}`,
        de: (url: string, statusText: string) =>
            `Fehler beim Abrufen der URL ${url}: ${statusText}`,
        fr: (url: string, statusText: string) =>
            `Échec de la récupération de l'URL ${url}: ${statusText}`,
        es: (url: string, statusText: string) =>
            `Error al obtener la URL ${url}: ${statusText}`
    },
    693: {
        en: (source: string, msg: string) =>
            `Network error fetching ${source}: ${msg}`,
        de: (source: string, msg: string) =>
            `Netzwerkfehler beim Abrufen von ${source}: ${msg}`,
        fr: (source: string, msg: string) =>
            `Erreur réseau lors de la récupération de ${source}: ${msg}`,
        es: (source: string, msg: string) =>
            `Error de red al obtener ${source}: ${msg}`
    },
    694: {
        en: (source: string, msg: string) =>
            `Failed to read file` + (source ? ` '${source}'` : '') + `: ${msg}`,
        de: (source: string, msg: string) =>
            `Fehler beim Lesen der Datei` + (source ? ` '${source}'` : '') + `: ${msg}`,
        fr: (source: string, msg: string) =>
            `Échec de la lecture du fichier` + (source ? ` '${source}'` : '') + `: ${msg}`,
        es: (source: string, msg: string) =>
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
        en: (format: string, errors: string) =>
            `${format} package validation failed: ${errors}`,
        de: (format: string, errors: string) =>
            `${format} Paket-Validierung fehlgeschlagen: ${errors}`,
        fr: (format: string, errors: string) =>
            `Échec de la validation du package ${format}: ${errors}`,
        es: (format: string, errors: string) =>
            `Error en la validación del paquete ${format}: ${errors}`
    },
    699: {
        en: (func: string) => `${func} not yet implemented`,
        de: (func: string) => `${func} ist noch nicht implementiert`,
        fr: (func: string) => `${func} pas encore implémenté`,
        es: (func: string) => `${func} aún no implementado`
    }
};

/**
 * Get message in current language with fallback to English
 */
function getMessage(code: number, ...args: any[]): string {
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
    static create(code: number, ...args: any[]): IRsp {
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
        ...args: any[]
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
