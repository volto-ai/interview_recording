# reCAPTCHA Setup Guide

## Einrichtung von Google reCAPTCHA v2

### 1. reCAPTCHA-Schlüssel erstellen

1. Gehen Sie zu [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Klicken Sie auf "Create" oder "Neue Website hinzufügen"
3. Wählen Sie **reCAPTCHA v2** → **"I'm not a robot" Checkbox**
4. Fügen Sie Ihre Domain(s) hinzu:
   - Für Entwicklung: `localhost`, `127.0.0.1`
   - Für Produktion: Ihre tatsächliche Domain (z.B. `example.com`)
5. Klicken Sie auf "Submit"
6. Kopieren Sie den **Site Key** und **Secret Key**

### 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env.local` Datei im Frontend-Verzeichnis:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=ihr_site_key_hier
```

Für den Backend-Server (falls Sie Server-seitige Verifizierung implementieren möchten):

```bash
# Backend (.env.dev.json oder Umgebungsvariable)
RECAPTCHA_SECRET_KEY=ihr_secret_key_hier
```

### 3. Aktuelle Konfiguration

Die Anwendung verwendet aktuell Test-Schlüssel für die Entwicklung. Für die Produktion müssen Sie:

1. Echte reCAPTCHA-Schlüssel von Google erhalten
2. Die Umgebungsvariablen entsprechend setzen
3. Die Domain in der reCAPTCHA-Konsole registrieren

### 4. Test-Schlüssel (nur für Entwicklung)

- **Site Key**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- **Secret Key**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

⚠️ **Wichtig**: Diese Test-Schlüssel funktionieren nur auf `localhost` und sollten niemals in der Produktion verwendet werden.

### 5. Server-seitige Verifizierung (Optional)

Falls Sie eine Server-seitige Verifizierung implementieren möchten, können Sie den Backend-Server erweitern, um die reCAPTCHA-Token zu validieren:

```python
# Beispiel für Backend-Verifizierung
import requests

def verify_recaptcha(token):
    response = requests.post('https://www.google.com/recaptcha/api/siteverify', {
        'secret': RECAPTCHA_SECRET_KEY,
        'response': token
    })
    return response.json()['success']
```

### 6. Troubleshooting

- **reCAPTCHA wird nicht angezeigt**: Überprüfen Sie, ob der Site Key korrekt ist
- **"Invalid domain" Fehler**: Stellen Sie sicher, dass Ihre Domain in der reCAPTCHA-Konsole registriert ist
- **Test-Schlüssel funktionieren nicht**: Test-Schlüssel funktionieren nur auf `localhost` und `127.0.0.1` 