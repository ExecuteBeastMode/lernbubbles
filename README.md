# Lernbubbles

Interaktive Lern-App fuer das Schornsteinfeger-Handwerk (Kaminkehrer), Bayern.

## Installieren (Windows)
1. Unter Releases die neueste Datei `Lernbubbles Setup ... .exe` herunterladen.
2. Starten. Windows zeigt eine SmartScreen-Warnung, weil der Installer nicht signiert ist: Weitere Informationen, Trotzdem ausfuehren.
3. Beim Start prueft der Launcher auf Programm-Updates und neue Lerninhalte. Danach Start druecken.

## Bedienung
- Bubbles anklicken: Themen oeffnen, Karten lesen, Quiz beantworten.
- Weiterlernen: naechste faellige Frage (Fehler kommen sofort wieder, richtige nach 1, 2, 4, 8, 16 Tagen).
- Pruefung (15 Fragen, ab 80 Prozent bestanden) und Strikt (eine falsche Antwort beendet die Pruefung).
- Stufen: Muss ich wissen, Taeglich im Job, Nice to know (Einschaetzung, mit dem Ausbilder abgleichen).
- Esc geht einen Schritt zurueck. Zahlen 1 bis 9 waehlen Antworten, Enter geht weiter, N startet Weiterlernen.
- Fortschritt liegt lokal. Mit den Pfeilen oben als Datei sichern oder laden.

## Quellen und Hinweis
Gesetze und Verordnungen: gesetze-im-internet.de und gesetze-bayern.de. Lehrplan: KMK Rahmenlehrplan Schornsteinfeger. Karten mit gelbem Hinweis sind nicht vollstaendig am Originaltext geprueft. Lernhilfe, keine Rechtsberatung.

## Entwicklung
Inhalt: `app/data.js` und `app/data2.js`. Oberflaeche: `app/index.html`. Programm: `main.js`, `launcher.html`. Jeder Push auf main baut einen neuen Installer (GitHub Actions).
