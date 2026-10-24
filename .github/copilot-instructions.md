# Copilot Instructions

## Projektrichtlinien
- AssetCache ist lazy geladen (anders als ItemCache, welches beim App-Start geladen wird). Bei update()-Operationen muss zuerst loadFromStorage() aufgerufen werden, falls der Cache noch nicht initialisiert wurde.
- Windows-Junctions, die während der Repo-Migration zur Vermeidung von Dateiduplikaten angelegt wurden (z.B. packages/common/public -> packages/vue/public, packages/vue/data -> packages/common/data), sollen per .gitignore ausgeschlossen und nicht als reale Verzeichnisse eingecheckt werden.
