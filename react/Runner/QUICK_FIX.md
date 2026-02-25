# ✅ ZEMLJEVID POPRAVLJEN - Deluje na emulatorju!

## Kaj sem popravil:

1. ✅ **PROVIDER_DEFAULT** namesto PROVIDER_GOOGLE - deluje na emulatorju
2. ✅ **Prikaz koordinat** spodaj - vidiš svojo lokacijo
3. ✅ **Rdeč marker** - vidiš kje si
4. ✅ **Fallback koordinate** - Ljubljana če GPS ne dela
5. ✅ **Brez Google Play Services** - deluje na vseh emulatorjih

## Kako deluje:

### 1. **Start Run** gumb:
- ▶️ Pritisni za začetek
- Začne šteti čas (0:00, 0:01, 0:02...)
- Začne šteti kilometre (0.00 km)
- Začne računati pace (min/km)

### 2. Med tekom:
- ⏱️ **Čas** - teče v realnem času
- 📏 **Kilometri** - merijo GPS premike
- 🏃 **Pace** - samodejno računanje (min/km)
- 📍 **Lokacija** - vidiš koordinate spodaj

### 3. **Stop Run** gumb:
- ⏹️ Pritisni ko končaš
- Shrani vse podatke:
  - Razdaljo (km)
  - Čas (trajanje)
  - Pace (min/km)
  - GPS pot (route)
  - Datum & ura
- Odpre modal za objavo

### 4. Shranjeno v "Runs":
- Pojdi na tab "Runs" (3. ikona)
- Vidiš vse teke
- Vsak prikazuje:
  - 📅 Datum
  - 📏 Kilometri
  - ⏱️ Čas
  - 🏃 Pace

## Zaženi aplikacijo:

```bash
npm start
```

Pritisni **a** za Android emulator

## Testiranje na emulatorju:

### Način 1 - Simuliraj GPS:
1. V emulatorju: `...` menu (Extended controls)
2. `Location`
3. Vnesi koordinate ali uporabi Search
4. Klikni `Send`

### Način 2 - Simuliraj hojo:
1. Extended controls → Location
2. Routes → `Add route`
3. Klikaj na zemljevid za narediti pot
4. `Play route`

### Test Run:
1. Odpri aplikacijo
2. Tab "Run" (prva ikona)
3. Pritisni **Start Run**
4. Čakaj 15 sekund (šteje čas!)
5. Pritisni **Stop Run**
6. Pojdi na tab "Runs"
7. Vidiš shranjen tek! ✅

## Če zemljevid še ni viden:

1. Reload app:
```bash
r (v terminalu kjer teče expo)
```

2. Ali restart:
```bash
npm start -- --clear
```

3. Ali rebuild:
```bash
npm run android
```

## Pomembno:

- ✅ Zemljevid deluje BREZ Google Maps API ključa na emulatorju
- ✅ Uporabi PROVIDER_DEFAULT (deluje povsod)
- ✅ GPS simulacija deluje v Extended controls
- ✅ Vse se shranjuje v "Runs" sekcijo
- ✅ Štetje časa deluje v realnem času
- ✅ Pace se računa samodejno

Zdaj deluje! 🎉
