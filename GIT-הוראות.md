# איך לעדכן את הפרויקט ב-Git

## איפה הפרויקט?
הפרויקט נמצא **בהורדות** (Downloads), בתיקייה:
```
C:\Users\saraa\Downloads\Final-Project
```
זו תיקיית **שורש הפרויקט** – בתוכה יש את `client` ו-`server`. הגיט נמצא כאן, לא בתוך client או server.

---

## לא צריך לבחור "סרבר או קליינט"
**מעלים את כל הפרויקט** – גם קליינט וגם סרבר. עושים את זה מתוך תיקיית השורש `Final-Project`.

---

## הפקודות (ב-Git Bash או בטרמינל)

**1. לעבור לתיקיית הפרויקט (חשוב – מהשורש):**
```bash
cd "C:/Users/saraa/Downloads/Final-Project"
```

**2. לבדוק שאת בתיקייה הנכונה:**
```bash
pwd
```
אמור להופיע משהו כמו: `.../Final-Project`

**3. להוסיף את כל השינויים (client + server):**
```bash
git add -A
```

**4. לשמור עם הודעה:**
```bash
git commit -m "עדכון הפרויקט"
```

**5. לשלוח ל-GitHub:**
```bash
git push origin main
```
(אם הענף אצלך נקרא `master` במקום `main`, כתבי: `git push origin master`)

---

## אם כתוב "המקום לא קיים" או "path not found"
- וודאי שהשורה מתחילה ב-`cd "C:/Users/saraa/Downloads/Final-Project"` (עם המרכאות).
- ב-Git Bash אפשר גם עם backslash: `cd "C:\Users\saraa\Downloads\Final-Project"`

## אם כתוב "not a git repository"
זה אומר שהטרמינל לא בתוך `Final-Project`. הרצי שוב:
```bash
cd "C:/Users/saraa/Downloads/Final-Project"
```
ואז שוב את הפקודות `git add`, `git commit`, `git push`.
