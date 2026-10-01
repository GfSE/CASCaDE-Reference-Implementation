# Copilot Instructions

## Projektrichtlinien
- AssetCache ist lazy geladen (anders als ItemCache, welches beim App-Start geladen wird). Bei update()-Operationen muss zuerst loadFromStorage() aufgerufen werden, falls der Cache noch nicht initialisiert wurde, damit zuvor importierte Assets nicht verloren gehen.
