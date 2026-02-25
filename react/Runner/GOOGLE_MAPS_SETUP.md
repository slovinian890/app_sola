# Google Maps Setup

Zemljevid potrebuje Google Maps API ključ.

## Pridobi BREZPLAČEN API ključ (5 minut)

### 1. Pojdi na Google Cloud Console:
https://console.cloud.google.com/

### 2. Ustvari projekt:
- Klikni "Select a project" → "New Project"
- Ime: "Running App"
- Klikni "Create"

### 3. Omogoči Maps API:
- Pojdi na: https://console.cloud.google.com/apis/library
- Išči: "Maps SDK for Android"
- Klikni "Enable"
- Išči: "Maps SDK for iOS"  
- Klikni "Enable"

### 4. Ustvari API ključ:
- Pojdi na: https://console.cloud.google.com/apis/credentials
- Klikni "Create Credentials" → "API Key"
- Kopiraj ključ (izgleda kot: `AIzaSy...`)

### 5. Dodaj v aplikacijo:

Odpri `app.json` in zamenjaj `AIzaSyDummyKeyForDevelopment` s svojim ključem:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "TVOJ_API_KLJUČ_TUKAJ"
    }
  }
},
"ios": {
  "config": {
    "googleMapsApiKey": "TVOJ_API_KLJUČ_TUKAJ"
  }
}
```

### 6. Znova zaženi aplikacijo:

```bash
npm run android
```

## BREZPLAČNO

- Google Maps je BREZPLAČEN za do 25,000 klicev/dan
- Za osebno uporabo je to več kot dovolj
- Ni potrebna kreditna kartica za testing

## Če zemljevid še vedno ne dela

1. Počisti cache:
```bash
npm start -- --clear
```

2. Ponovno namesti:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

3. Preveri dovoljenja:
- Dovoli aplikaciji dostop do lokacije
- Preveri GPS je vklopljen

## Zemljevid bo pokazal:
- ✅ Modro piko - tvoja trenutna lokacija
- ✅ Rdeči marker - označena pozicija
- ✅ Sledenje - zemljevid te sledi ko tečeš
- ✅ Zoom - lahko povečaš/pomanjšaš
