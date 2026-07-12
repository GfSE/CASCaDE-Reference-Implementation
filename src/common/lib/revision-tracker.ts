import { IIdentifiable } from '../schema/pig/ts/pig-metaclasses';
import { TISODateString, ILanguageText } from './helpers';
import { LOG } from './helpers';
import { PLI } from './platform-independence';

export type ImportMode = 'replace' | 'update';

export class RevisionTracker {
    static makeRevision(): string {
        return PLI.makeUUID();
    }
/*    static makeRevision(id: string, title?: string, modified?: TISODateString): string {
        try {
            const titleStr = title || '';
            const modifiedStr = modified || '';
            const baseString = `${id}${titleStr}${modifiedStr}`;
            
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                return this.simpleHash(baseString);
            }
            
            return PLI.makeUUID();
        } catch (error) {
            LOG.warn('Failed to generate deterministic revision, using UUID fallback', error);
            return PLI.makeUUID();
        }
    }

    private static simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
        const timestamp = Date.now().toString(16);
        return `rev-${hexHash}-${timestamp}`;
    } */

    static compareDates(date1?: TISODateString, date2?: TISODateString): number {
        if (!date1 && !date2) return 0;
        if (!date1) return -1;
        if (!date2) return 1;

        try {
            const time1 = new Date(date1).getTime();
            const time2 = new Date(date2).getTime();
            
            if (isNaN(time1) || isNaN(time2)) {
                LOG.warn('Invalid date format in comparison', { date1, date2 });
                return 0;
            }
            
            return time1 - time2;
        } catch (error) {
            LOG.error('Error comparing dates', error);
            return 0;
        }
    }

    static isNewer(newElement: IIdentifiable, existingElement: IIdentifiable): boolean {
        return this.compareDates(newElement.modified, existingElement.modified) > 0;
    }

    static updateWithRevision<T extends IIdentifiable>(newElement: T, existingElement: T): T {
        let titleStr: string | undefined;
        if (Array.isArray(newElement.title) && newElement.title.length > 0) {
            titleStr = typeof newElement.title[0] === 'object' ? (newElement.title[0] as any).value : String(newElement.title[0]);
        }

        const newRevision = this.makeRevision();
        const priorRev: string[] = [];
        
        if (existingElement.revision) {
            priorRev.push(existingElement.revision);
        }
        
        if (Array.isArray(existingElement.priorRevision)) {
            priorRev.push(...existingElement.priorRevision);
        }

        const updatedElement = { ...newElement, revision: newRevision, priorRevision: priorRev.length > 0 ? priorRev : undefined };

        LOG.info(`Updated element ${newElement.id} with new revision ${newRevision}`);

        return updatedElement;
    }

    static shouldUpdate(mode: ImportMode, newElement: IIdentifiable, existingElement?: IIdentifiable): boolean {
        if (mode === 'replace') {
            return true;
        }

        if (mode === 'update') {
            if (!existingElement) {
                return true;
            }
            return this.isNewer(newElement, existingElement);
        }

        return false;
    }
}
