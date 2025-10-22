# Configuration du Mot de Passe Admin

## Mot de passe généré

Voici le mot de passe administrateur complexe et sécurisé :

```
Adm!n2024$EcoM&Eff1c!ency#Xp9K@SecurePass
```

**⚠️ IMPORTANT : Sauvegardez ce mot de passe dans un endroit sûr !**

## Configuration

### 1. Ajoutez le mot de passe dans votre fichier `.env.local`

Dans le fichier `next/.env.local`, ajoutez cette ligne :

```bash
ADMIN_PASSWORD=Adm!n2024$EcoM&Eff1c!ency#Xp9K@SecurePass
```

Si le fichier `.env.local` n'existe pas encore, créez-le dans le dossier `next/`.

### 2. Redémarrez votre serveur de développement

Après avoir ajouté le mot de passe dans `.env.local`, redémarrez votre serveur :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez-le
npm run dev
```

## Utilisation

### Se connecter

1. Accédez à : **http://localhost:5000/admin/login**
2. Entrez le mot de passe ci-dessus
3. Cliquez sur "Se connecter"

### Accéder au panel admin

Une fois connecté, vous pouvez accéder à : **http://localhost:5000/admin/sessions**

Le cookie de session est valide pendant **7 jours**, vous n'aurez donc pas besoin de vous reconnecter à chaque fois.

### Se déconnecter

Cliquez sur le bouton "Se déconnecter" en bas de la page admin.

## Sécurité

- ✅ Le mot de passe est stocké uniquement dans les variables d'environnement
- ✅ Les cookies sont sécurisés (httpOnly, sameSite)
- ✅ La session expire après 7 jours
- ✅ Pas de token visible dans l'URL
- ✅ Le mot de passe contient des caractères spéciaux, majuscules, minuscules et chiffres

## Changer le mot de passe

Pour changer le mot de passe, modifiez simplement la valeur dans `.env.local` et redémarrez le serveur.

## Architecture

Le système d'authentification comprend :

1. **Page de login** : `/admin/login` - Interface de connexion
2. **API de login** : `/api/admin/auth/login` - Vérifie le mot de passe et crée le cookie
3. **API de vérification** : `/api/admin/auth/verify` - Vérifie la validité du cookie
4. **API de logout** : `/api/admin/auth/logout` - Supprime le cookie de session
5. **Pages protégées** : `/admin/sessions` - Vérifie le cookie avant d'afficher le contenu

