# Kako zagnati aplikacijo

Aplikacija je pripravljena! Vse je pravilno nastavljeno.

## Zaženi aplikacijo

### Android:
```bash
npm run android
```

### iOS:
```bash
npm run ios
```

### Expo Dev:
```bash
npm start
```
Nato pritisni:
- **a** - za Android
- **i** - za iOS  
- **w** - za Web

## Če se TypeScript pritožuje

Če vidiš napake v VS Code/Cursor, poskusi:

1. **Restart TypeScript Server:**
   - V VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
   - V Cursor: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

2. **Reload Window:**
   - `Ctrl+Shift+P` → "Developer: Reload Window"

## Kaj deluje

✅ **Google Maps** - za prikaz lokacije in sledenje teku
✅ **User Profile** - klik na uporabnike v feed/social vodi na njihov profil
✅ **Location field** - v profilu lahko dodaš svojo lokacijo
✅ **Run Tracking** - sledenje teku z GPS
✅ **Runs List** - vsi teki se shranjujejo in prikazujejo
✅ **Feed** - feed z objavami
✅ **Social** - iskanje in sledenje uporabnikom

## Pomembno

- Aplikacija uporablja **Google Maps** (ne Mapbox)
- Vsi teki se shranjujejo v "Runs" sekciji
- Lokacija uporabnika je vidna kot modra pika na zemljevidu
- Rdeča ikona označuje tvojo trenutno pozicijo

## Če ne deluje na Samsung A35

1. Počisti cache:
```bash
npm start -- --clear
```

2. Ali ponovno namesti:
```bash
rm -rf node_modules
npm install
npm run android
```

Vse deluje! 🎉
