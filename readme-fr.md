# C'est quoi ?
Peertube Mass Uploader (PMU) est un script nodeJS permettant l'envoi en masse de vidéos dans Peertube à partir de fichiers mp4, posters (jpg, png, webp), sous-titres (srt, vtt) et d'un fichier de données au format XLSX. Les informations de chaque vidéo une fois dans Peertube peuvent ensuite être injectées dans ce fichier XLSX : son url, id, short uuid, uuid, et date d'upload.

**PMU est sous licence [CeCILL 2.1](https://cecill.info/licences/Licence_CeCILL_V2.1-fr.html).**

# Comment ça marche ?
PMU parcourt un dossier à la recherche de fichiers mp4. En se basant sur le nom du premier fichier mp4 trouvé, il va récupérer ses fichiers annexes (poster, sous-titre) et ses informations dans le fichier XLSX. Il utilise aussi ce nom de fichier pour déterminer si la vidéo est bien absente de PeerTube. Le cas échéant, il envoie la vidéo dans PeerTube avec toutes les informations récupérées, et si besoin envoie dans le XLSX des informations de PeerTube concernant la vidéo. Puis il passe au fichier mp4 suivant.

# Pré-requis
- node.js (v20.11.1)
- npm (v9)
- les modules nécessaires à l'outil, installés avec :
```
npm install
```
La configuration se fait via deux fichiers :
- Un [fichier de paramétrage **.yaml**](#fichier-settingsyaml) qui définit les paramètres d'utilisation du script. Le chemin vers ce fichier doit être renseigné au [lancement du script](#lancement-du-script). Dans ce doc nous utiliserons *settings.yaml* mais il peut prendre n'importe quel nom. Un fichier *example-settings.yaml* est donné à titre d'exemple.
- Un [fichier de données **.xlsx**](#fichier-xlsx) qui contient les informations des vidéos (titre, description, chaîne, etc.) et où peuvent être ensuite injectées l'url et les ids de chaque vidéo après son upload. Le chemin vers ce fichier doit être renseigné dans [`data:file:`](#datafile) du fichier de paramétrage.

Quelques arguments peuvent aussi être définis au [lancement du script](#lancement-du-script).

> ❗❗ **ATTENTION** Ces deux fichiers ne doivent pas faire partie du dépôt Git de PMU, puisqu'ils sont propres à chaque utilisateur. Il est toutefois possible de les versionner dans un autre projet Git utilisant PMU en tant que sous-module Git, de la façon indiquée en toute fin de ce document.

# Fichier .xlsx
Ce fichier contient les données de chaque vidéo, comme son titre ou sa description, à raison d'une vidéo par ligne et une donnée par colonne.
L'ordre de ces colonnes est libre, mais il faudra l'indiquer dans [`data:in:`](#datain) de [settings.yaml](#fichier-settingsyaml).

Toutes ces colonnes contiennent du texte tel qu'il apparaît en front, et non des ids. Par exemple si on souhaite ajouter une vidéo à la chaîne dont le nom est "Captation concerts" et l'id "captation_concerts_1", sa colonne *channel* devra contenir "Captation concerts" (ou "captation concerts" car la casse est ignorée).

Pour plus d'informations sur le contenu de ces colonnes, consulter [`data:in:`](#datain).

# Fichier settings.yaml

## Environnements
Chaque clé au niveau racine de ce fichier définit un environnement. Il doit au moins exister `default:` qui est l'environnement utilisé si aucun n'est spécifié au lancement du script par l'argument `--env`. D'autres environnements peuvent être créés en leur donnant un nom quelconque et en y plaçant les paramètres qui surchargeront ceux par défaut, car les valeurs de `default` sont d'abord récupérées quel que soit l'environnement utilisé.
> 💡 Utilisez l'environnement `default:` pour y mettre les valeurs génériques, et créez d'autres environnements pour n'y mettre que les valeurs spécifiques.

## Paramètres
À placer dans les environnements. Sauf indication contraire, tous les paramètres sont nécessaires.

## `misc:`
`baseurl:` url de base du Peertube, par ex. *http://127.0.0.1:9001/*. L'API sera alors appelée à *http://127.0.0.1:9001/api/v1/*<br>
`uploadPauseMs:` (optionnel) temps de pause en ms après chaque upload (aucun par défaut).<br>
`limit:` (optionnel) limite le traitement au N premiers mp4 du dossier [`paths:`](#paths)`todo:`, dans l'ordre alphabétique. Par défaut, tous sont traités. La valeur 0 annule cette limite, et les valeurs inférieures retournent tous les mp4 sauf les -N derniers. Peut être surchargé au lancement du script avec l'argument `--limit`.

## `user:`
`name:` nom du compte Peertube à utiliser.<br>
`pwd:` mot de passe de ce compte.

Exemple en local par défaut :
```yaml
user:
  name: root
  pwd: test
```

## `db:`
Paramètres d'accès à la BDD PostgreSQL de Peertube. Exemple en local par défaut :
```yaml
db:
  host: 127.0.0.1
  port: 5432
  database: peertube_dev
  user: postgres
  password: postgres
```

## `paths:`
`todo:` dossier où se trouvent les fichiers à uploader : mp4, posters et sous-titres (les sous-dossiers sont ignorés).<br>
`wip:` dossier où l'outil va déplacer chaque fichier mp4 avant son traitement.<br>
`done:` dossier où l'outil déplacera les fichiers une fois bien uploadés.<br>
`doubles:` dossier où l'outil déplacera les vidéos déjà existantes.<br>
`failed:` dossier où l'outil déplacera les fichiers en cas d'échec.<br>

> 👉 Lorsqu'un fichier mp4 est déplacé, ses fichiers liés et utilisés (sous-titres, poster) sont déplacés avec lui.

## `files:`
### `files:identifierRegex:`
Expression régulière (sensible à la casse) qui sera appliquée à chaque nom de fichier mp4 et utilisée pour construire l'identifiant de la vidéo dans le XLSX (cf. [`data:identifierValue:`](#dataidentifiervalue)), savoir si elle est déjà présente dans Peertube (cf. [`data:dbCheck:`](#datadbcheck)), et récupérer ses fichiers de poster et sous-titres (voir ci-dessous).<br>
### `files:posters:`
Liste des fichiers pouvant être utilisés comme poster, par ordre de préférence. Le premier fichier existant sera celui utilisé. Chaque élément de la liste est appliqué sur `files:identifierRegex:` pour construire un nom de fichier. Par exemple :
```yaml
posters:
  - $1.jpg
  - $1.jpeg
  - $1.webp
  - $1.png
```
### `files:captions:`
Liste des fichiers pouvant être utilisés comme sous-titres, de la même façon que pour les posters, par exemple :
```yaml
captions:
  - $1.vtt
  - $1.srt
```

## `data:`
### `data:file:`
Chemin vers le fichier XLSX contenant les données.

### `data:identifierValue:`
Motif appliqué sur [`files:identifierRegex:`](#filesidentifierregex) pour construire la chaîne recherchée dans la colonne *identifier* du xslx (cf. [`data:in:`](#datain)`identifier:`).<br>

### `data:dbCheck:`
Motif appliqué sur `files:identifierRegex:` pour vérifier en BDD si la vidéo existe déjà ou pas, en utilisant un [SIMILAR TO](https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-SIMILARTO-REGEXP) sur le champ *filename* de la table *videoSource*. Si la vidéo est déjà dans Peertube, elle sera déplacée dans le dossier *doubles* (cf. [paths](#paths)).<br>

### Exemple
---
Un fichier "quite-long-video-2023-08-31.mp4" correspond à la ligne du XLSX où la colonne `identifier` (définie dans [`data:in:`](#datain)) contient "quite-long-video". On ne veut pas uploader la vidéo dans Peertube si on la trouve sous le nom "quite-long-video-2023-08-31.mp4" mais aussi "quite-long-video-2024-02-20.mp4" ou n'importe quelle date. Idem pour toutes les autres vidéos.

- On va donc construire l'identifiant de la vidéo en utilisant son nom de fichier moins ses 15 derniers caractères. Cela donne "quite-long-video".
- Le script va chercher dans le XLSX la ligne dont la colonne "identifier" contient cet identifiant "quite-long-video".
- Pour savoir si cette vidéo existe déjà dans Peertube, on va utiliser cet identifiant suivi de n'importe quels 15 caractères, puisqu'elle peut exister avec différentes dates.

Le paramétrage sera donc :

```yaml
files:
  identifierRegex: ^(.*).{15}$
data:
  identifierValue: $1
  dbCheck: $1_{15}
```
- `files:identifierRegex:` On définit l'identifiant en capturant tous les caractères du nom de fichier, moins les 15 derniers.
- `data:identifierValue:` L'identifiant recherché dans le XLSX sera simplement cet identifiant.
- `data:dbCheck:` On cherche en base une vidéo dont la source est cet identifiant suivi de n'importe quels 15 caractères. Si elle existe, l'upload est annulé.

>👉 https://regex101.com/r/kUW4Ug/1 pour tester des substitutions de regex.

---

### `data:in:`
C'est une liste de mots-clés qui identifient le rôle de chaque colonne du XLSX, de la gauche vers la droite. Si une colonne n'a aucun rôle dans l'outil d'upload, utiliser une valeur quelconque qui n'est pas un mot-clé. Par exemple si la 1re colonne contient l'**identifiant** de la vidéo, la 3e son **titre**, et que la 2e n'a aucune utilité particulière, le 1er élément de cette liste sera `identifier`, le 3e `title`, et le 2nd `useless` ou n'importe quelle autre valeur (même une chaîne vide ou déjà présente ailleurs).

`- identifier`<br>
Colonne contenant l'identifiant qui permet de retrouver la vidéo dans le XLSX à partir du nom de fichier (cf. [`data:identifierValue:`](#dataidentifiervalue)).

`- title`<br>
Colonne contenant le titre de la vidéo.

`- description`<br>
Colonne contenant la description de la vidéo.

`- channel`<br>
Colonne contenant la chaîne Peertube de la vidéo. Cette chaîne doit exister avant l'upload, sans quoi le script déplacera la vidéo dans [`paths:`](#paths)`failed:` et passera à la suivante.

`- playlists`<br>
Colonne contenant la ou les listes de lecture (séparées par un point-virgule) de la chaîne où sera placée la vidéo. Contrairement aux chaînes, le script créera les playlists manquantes.

`- privacy`<br>
Colonne contenant la visibilité de la vidéo. Côté XLSX, elle doit prendre une des valeurs indiquées dans [`data:privacies:`](#dataprivacies).

`- category`<br>
Colonne contenant la catégorie de la vidéo d'après une des valeurs retournées par l'API [videos/categories](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getCategories).

`- language`<br>
Colonne contenant la langue audio de la vidéo. Côté XLSX, elle doit prendre une des valeurs indiquées dans [`data:languages:`](#datalanguages).

`- tags`<br>
Colonne contenant le ou les mots-clés de la vidéo, séparés par un point-virgule.

`- publicationDate`<br>
Colonne contenant la date de publication de la vidéo, au format "Y-m-d" (par ex. "2023-12-31") ou une simple année (auquel cas "-01-01" sera ajouté).

Il existe aussi des mots-clés optionnels permettant de définir les colonnes accueillant des valeurs retournées par l'outil. Voir [`data:out:`](#dataout) ci-dessous pour plus d'informations.

### `data:out:`
Après chaque upload réussi, l'outil peut écrire dans le XLSX les infos récupérées depuis Peertube. Il suffit d'ajouter un des mots-clés ci-dessous dans cette section, ainsi que dans [`data:in:`](#datain) à l'emplacement correspondant à sa colonne dans le XLSX.

`- peertubeUrl`<br>
Url de la vidéo, par ex. *http://127.0.0.1:9001/w/cZyCiabkHDqLrmy6sYmthv*.

`- peertubeId`<br>
Id de la vidéo, par ex. *155*.

`- peertubeShortUuid`<br>
UUID courte de la vidéo, par ex. *cZyCiabkHDqLrmy6sYmthv*.

`- peertubeUuid`<br>
UUID de la vidéo, par ex. *611e06c9-31a7-44bc-b5e9-604963b56ca9*.

`- uploadDate`<br>
Date de l'upload au format défini dans [`data:uploadDateFormat:`](#datauploaddateformat), par ex. *25/03/2024 16:10:35* au format "fr-FR" ou *3/25/2024, 4:10:35 PM* au format "en-US".

### `data:uploadDateFormat:`
Format utilisé pour l'écriture de la date d'upload dans le XLSX, par ex. `fr-FR` ou `en-US`. C'est le 1er argument de [Date.prototype.toLocaleString()](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString).

### `data:languages:`
Liste des équivalences entre [les langues dans Peertube](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getLanguages)  et celles dans le XLSX, sur le schéma `clé: valeur`. Dans l'exemple ci-dessous, la colonne `language` du XLSX devra contenir "Anglais" pour indiquer que la vidéo est en langue anglaise (cf. [`data:in:`](#datain)).
```yaml
languages:
  en: Anglais
  fr: Français
```

### `data:privacies:`
Liste des équivalences entre [les visibilités dans Peertube](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getVideoPrivacyPolicies) et celles dans le XLSX. Par exemple :
```yaml
privacies:
  - Publique
  - Non listée
  - Privée
  - Interne
  - Protégée
```

## `logs:`
Mettre chacun des 5 niveaux à `true` ou `false` selon le besoin d'envoyer dans la console les informations en rapport, par exemple :
```yaml
logs:
  debug: false
  info: true
  warning: true
  error: true
  fatal: true
```

# Lancement du script
Une fois la configuration faite, le script peut être lancé sur l'environnement par défaut avec :
```
node upload.js --settings=../settings.yaml | tee -a logs/upload.log
```
La partie `node upload.js` lance le script en utilisant les paramètres du fichier *settings.yaml* situé dans le dossier parent, tandis que la partie optionnelle `| tee -a logs/upload.log` ajoute (flag -a) les informations affichées dans la console au fichier *logs/upload.txt*.
> ❗❗ **ATTENTION** Veiller à ce que le fichier XLSX ne soit pas ouvert avant l'upload car cela le rend inaccessible en écriture, les informations récupérées depuis Peertube (url, ids...) ne pourront donc pas y être enregistrées et seront perdues.

## Arguments optionnels

- `--env` pour définir l'environnement à utiliser.
- `--limit` pour ne traiter qu'un certain nombre de fichier, en surchargeant la valeur éventuellement définie dans [settings.yaml](#fichier-settingsyaml).

Par exemple, pour ne traiter que les **10** premiers fichiers en environnement **prod** :
```
node upload.js --settings=../settings.yaml --limit=10 --env=prod | tee -a logs/uploadProd.log
```

# Problèmes connus
- Le fichier XLSX perd son formatage.
- Les licences ne sont pas gérées.
- L'upload d'une vidéo peut parfois échouer avec des erreurs type "write EPIPE" ou "write ECONNRESET". La plupart du temps c'est lié à un pb d'espace disque ou de CPU trop sollicité. Il suffit généralement de relancer l'outil plus tard, une fois ces ressources à nouveau disponibles, pour que les mêmes vidéos soient bien uploadées.

# Pistes d'amélioration
- Tous les champs sont obligatoires dans le fichier XLSX alors que certains pourraient avoir une valeur par défaut (par ex. channel ou privacy), extraite du nom de fichier (par ex. titre), retournée par une fonction (par ex. 'now' pour publicationDate) ou simplement ignorée.
- D'autres formats du fichier de données devraient être autorisés en plus du XLSX, par exemple CSV ou JSON.
- L'outil récupère toutes les données depuis le XLSX à partir de chaînes, mais on devrait pouvoir aussi traiter des ids.
- Ajouter des tests unitaires et fonctionnels.

# Bonus : intégrer PMU à un autre projet
PMU a besoin pour fonctionner de fichiers qui sont propres à chaque utilisateur, donc absents de son dépôt Git. Il est possible de versionner ces fichiers en créant un autre projet Git, dans lequel PMU sera ajouté en tant que sous-module Git. Cela permet de travailler aussi bien sur ce projet que dans le PMU embarqué, les mettre à jour ou changer de branche, indépendamment l'un de l'autre.

- Allez dans le dossier de votre projet, et ajoutez PMU en tant que sous-module Git
```bash
cd mon-projet
git submodule add https://github.com/Reseau-Canope/peertube-mass-uploader.git
```
- Il faut ensuite installer les modules dont PMU a besoin :
```bash
cd peertube-mass-uploader
npm install
```
- Il suffit maintenant de lancer le script en lui indiquant votre fichier de paramètres, par exemple :
```bash
cd ..
node peertube-mass-uploader/upload.js --settings=settings.yaml
```
