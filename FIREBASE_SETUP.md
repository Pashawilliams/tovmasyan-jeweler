# Firebase Auth setup for TOVMASYAN Jeweler

Код реальной регистрации уже добавлен на сайт. Чтобы активировать вход через Google, нужно один раз создать Firebase-проект и вставить публичный `firebaseConfig`.

## 1. Создать Firebase project

Откройте:

https://console.firebase.google.com/

Создайте проект:

```text
tovmasyan-jeweler
```

## 2. Включить Authentication

Firebase Console → Build → Authentication → Get started → Sign-in method → Google → Enable.

Project public-facing name:

```text
TOVMASYAN Jeweler
```

## 3. Добавить Web App

Project settings → General → Your apps → Web `</>`.

Название:

```text
TOVMASYAN Website
```

Firebase покажет код:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Скопируйте значения в файл:

```text
firebase-config.js
```

## 4. Authorized domains

Authentication → Settings → Authorized domains.

Добавьте:

```text
pashawilliams.github.io
```

## 5. Firestore Database

Firebase Console → Build → Firestore Database → Create database.

Для старта можно использовать test mode, затем заменить правилами ниже.

## 6. Рекомендуемые Firestore Rules

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /favorites/{favoriteId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /orders/{orderId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Apple ID

Кнопка Apple ID уже есть в интерфейсе, но для реального входа нужен Apple Developer аккаунт и настройка Sign in with Apple в Firebase Authentication.
