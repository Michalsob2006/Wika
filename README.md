# Randka z Wikusią

Statyczna, responsywna strona do zaproszenia Wikusi na randkę. Działa bez frameworków, procesu budowania i backendu.

## 1. Klucz Web3Forms

1. Załóż formularz w Web3Forms i skopiuj swój access key.
2. Otwórz plik `script.js`.
3. Zamień:

```js
const WEB3FORMS_ACCESS_KEY = "WKLEJ_TUTAJ_ACCESS_KEY";
```

na swój prawdziwy klucz.

## 2. Uruchomienie lokalnie

Możesz po prostu otworzyć `index.html` w przeglądarce.

Opcjonalnie uruchom lokalny serwer:

```bash
python3 -m http.server 8000
```

Następnie wejdź na `http://localhost:8000`.

## 3. Repozytorium na GitHubie

1. Utwórz nowe repozytorium na GitHubie.
2. W terminalu w katalogu projektu wykonaj:

```bash
git add index.html style.css script.js README.md
git commit -m "Add romantic date invitation page"
git branch -M main
git remote add origin ADRES_TWOJEGO_REPOZYTORIUM
git push -u origin main
```

## 4. Publikacja przez GitHub Pages

1. Wejdź w ustawienia repozytorium na GitHubie.
2. Otwórz sekcję **Pages**.
3. Wybierz źródło: branch `main`, folder `/root`.
4. Zapisz ustawienia i poczekaj, aż GitHub pokaże adres strony.

## 5. Sprawdzenie wysyłania formularza

1. Upewnij się, że w `script.js` jest prawdziwy klucz Web3Forms.
2. Otwórz stronę.
3. Przejdź przez kroki, wybierz datę, godzinę i klimat randki.
4. Kliknij **Wyślij moje wybory 💗**.
5. Sprawdź skrzynkę e-mail przypisaną do Web3Forms.

## Reset blokady quizu podczas testowania

Ta instrukcja jest tylko dla właściciela strony. W konsoli przeglądarki wpisz:

```js
localStorage.removeItem("wikaQuizLocked");
sessionStorage.removeItem("wikaQuizPassed");
location.reload();
```
