export interface INeo4jExportOptions {
    uri: string;
    username: string;
    password: string;
    database?: string;
}

export interface INeo4jExportResult {
    ok: boolean;
    message: string;
}

/**
 * Export Cypher text to a Neo4j server via the HTTP transaction endpoint.
 * Statements are split and schema statements are sent before data statements.
 * Note: this uses HTTP only (no Bolt/Neo4j driver).
 */
export async function exportToNeo4j(
    cypherText: string,
    options: INeo4jExportOptions
): Promise<INeo4jExportResult> {
    const database = options.database ?? 'neo4j';
    const httpBaseUri = normalizeNeo4jUri(options.uri.trim());
    const endpoint = `${httpBaseUri.replace(/\/+$/, '')}/db/${encodeURIComponent(database)}/tx/commit`;

    const statements = splitCypherStatements(cypherText);
    const authHeader = `Basic ${base64Encode(`${options.username}:${options.password}`)}`;

    const schemaStatements = statements.filter(isSchemaStatement);
    const dataStatements = statements.filter(statement => !isSchemaStatement(statement));

    console.info('[Export Neo4j] schemaStatements count:', schemaStatements.length);
    console.info('[Export Neo4j] dataStatements count:', dataStatements.length);

    for (const statement of schemaStatements) {
        const result = await sendNeo4jSingleStatement(endpoint, authHeader, statement);
        if (!result.ok) {
            return {
                ok: false,
                message: `Neo4j schema export failed: ${result.message}`
            };
        }
    }

    for (const statement of dataStatements) {
        const result = await sendNeo4jSingleStatement(endpoint, authHeader, statement);
        if (!result.ok) {
            return {
                ok: false,
                message: `Neo4j data export failed: ${result.message}`
            };
        }
    }

    return {
        ok: true,
        message: `Neo4j export succeeded for ${options.uri} (database=${database})`
    };
}

async function sendNeo4jSingleStatement(endpoint: string, authHeader: string, statement: string): Promise<INeo4jExportResult> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Accept': 'application/json;charset=UTF-8',
            'Content-Type': 'application/json',
            'Authorization': authHeader
        },
        body: JSON.stringify({ statements: [{ statement }] })
    });

    let responseBody: any;
    try {
        responseBody = await response.json();
    } catch {
        responseBody = null;
    }

    const errors = Array.isArray(responseBody?.errors) ? responseBody.errors : [];
    if (!response.ok || errors.length > 0) {
        const errorMessage = errors.length > 0
            ? errors.map((err: any) => `${err.code || 'UNKNOWN'}: ${err.message || JSON.stringify(err)}`).join('; ')
            : `${response.status} ${response.statusText}`;

        return {
            ok: false,
            message: `${errorMessage} | statement: ${statement.substring(0, 300)}`
        };
    }

    return {
        ok: true,
        message: ''
    };
}

function splitCypherStatements(cypherText: string): string[] {
    const statements: string[] = [];
    let buffer = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < cypherText.length; i++) {
        const char = cypherText[i];
        const next = cypherText[i + 1];

        if (inLineComment) {
            buffer += char;
            if (char === '\n') {
                inLineComment = false;
            }
            continue;
        }

        if (inBlockComment) {
            buffer += char;
            if (char === '*' && next === '/') {
                buffer += next;
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
            if (char === '/' && next === '/') {
                buffer += char;
                inLineComment = true;
                continue;
            }
            if (char === '/' && next === '*') {
                buffer += char;
                inBlockComment = true;
                continue;
            }
        }

        if (char === '\'' && !inDoubleQuote && !inBacktick) {
            const escaped = i > 0 && cypherText[i - 1] === '\\';
            if (!escaped) {
                inSingleQuote = !inSingleQuote;
            }
        } else if (char === '"' && !inSingleQuote && !inBacktick) {
            const escaped = i > 0 && cypherText[i - 1] === '\\';
            if (!escaped) {
                inDoubleQuote = !inDoubleQuote;
            }
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
            inBacktick = !inBacktick;
        }

        if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick && !inBlockComment && !inLineComment) {
            const statement = buffer.trim();
            if (statement.length > 0) {
                statements.push(statement);
            }
            buffer = '';
            continue;
        }

        buffer += char;
    }

    const lastStatement = buffer.trim();
    if (lastStatement.length > 0) {
        statements.push(lastStatement);
    }

    return statements.filter(statement => !isCommentOnlyStatement(statement));
}

function isCommentOnlyStatement(statement: string): boolean {
    const cleaned = statement
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
    return cleaned.length === 0;
}

function isSchemaStatement(statement: string): boolean {
    const cleaned = stripLeadingComments(statement).toUpperCase();
    return cleaned.startsWith('CREATE CONSTRAINT') || cleaned.startsWith('DROP CONSTRAINT') || cleaned.startsWith('CREATE INDEX') || cleaned.startsWith('DROP INDEX');
}

function stripLeadingComments(statement: string): string {
    let remaining = statement.trim();
    while (remaining.length > 0) {
        if (remaining.startsWith('//')) {
            const nextLine = remaining.indexOf('\n');
            remaining = nextLine >= 0 ? remaining.substring(nextLine + 1).trim() : '';
            continue;
        }
        if (remaining.startsWith('/*')) {
            const endBlock = remaining.indexOf('*/', 2);
            remaining = endBlock >= 0 ? remaining.substring(endBlock + 2).trim() : '';
            continue;
        }
        break;
    }
    return remaining;
}

function normalizeNeo4jUri(uri: string): string {
    let normalizedUri = uri;
    if (/^bolt:\/\//i.test(uri) || /^neo4j:\/\//i.test(uri)) {
        normalizedUri = uri.replace(/^(bolt|neo4j):\/\//i, 'http://');
    }

    try {
        const url = new URL(normalizedUri);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            if (url.port === '7687') {
                url.port = '7474';
            } else if (url.port === '7688') {
                url.port = '7473';
            }
            return url.origin;
        }
    } catch {
        // fall through and try a simple HTTP normalization
    }

    return normalizedUri.replace(/\/+$/, '');
}

function base64Encode(value: string): string {
    if (typeof btoa === 'function') {
        return btoa(value);
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'utf-8').toString('base64');
    }

    throw new Error('Base64 encoding is not available in this environment.');
}
