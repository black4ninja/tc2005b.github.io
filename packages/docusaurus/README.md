# Docusaurus project configuration

## Cloned Repository Configuration

## 1 - Build everything

Execute the following commands:

```
yarn
yarn start
yarn build
```

> **That's all you need you can work on the project.**

## New Repository Configuration
### 1 - Generate new docusaurus

Execute the following command:
```
npx create-docusaurus@latest my-website classic
```

### 2 - Get all in root

Pass the content generated in my-website folder to the root of the repository.

> Note: Only do this if the project is only for docusaurus if not configure it inside the folder to live along the other project.

### 3 - Configure config file

Open the **docusaurus.config.js** file and modify the following lines:

```
title: "TITLE" //Title project
tagline: "DESCRIPTION" //Description project

url: "https://meeplab2015.github.io" //Where is going to be uploaded, if it is pages in github is the previous.
baseurl: "/" //It may change but when deployed it will say where
organizationName: 'meeplab2015', // Usually your GitHub org/user name.
projectName: 'REPO_NAME', // Usually your repo name.
```

### 4 - Add Husky

execute the following to add Husky to the project.

> Note: Husky is used to protect the project docusaurus from errors in compiling when deploying.

```
yarn add -D husky
```

Add to package.json:

```
{
  "scripts": {
    "postinstall": "husky install"
  }
}
```

Create the .husky folder

```
yarn install
yarn build
```

### 5 - Build the project

Execute a yarn installation

```
yarn
```
### 6 - Add the .gitignore

Make sure the **.gitignore** file contains the following

```
# Dependencies
/node_modules

# Production
/build

# Generated files
.docusaurus
.cache-loader

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

```
### 7 - Husky configuration

Erase all in the .husky folder that is not needed, at least keep:

- **commit-msg**
- **pre-commit**
- **pre-push** 

> Note: It depends on the project.

**Suggestions for husky files on docusaurus:**

#### commit-msg

```
#!/usr/bin/env sh

# Read commit message
message=$(cat "$1")

# Regex pattern
requiredPattern="^(build|chore|feat|fix|docs|refactor|perf|style|test): .+$"

# Check if the commit message is valid
if ! echo "$message" | grep -iqE "$requiredPattern"; then
  cat <<EOF
.
.
Oh no! Tu commit message tiene el formato incorrecto :(
El message debe de estar en el siguiente formato:
<type>: <subject>
Los 'type' aceptados son: build, chore, feat, fix, docs, refactor, perf, style, test
Ejemplo: fix: ensure Range headers adhere more closely to RFC 2616
.
Tu message fue:
$message
.
Si quieres conocer más sobre este estándar, visita: https://dev.to/ishanmakadia/git-commit-message-convention-that-you-can-follow-1709
.
No te preocupes, intenta de nuevo. TQM <3
EOF

  # Exit with error status
  exit 1
fi
```

#### pre-commit

```
# Build site to check any problems
yarn build && exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "Error during yarn build: "
    cat yarn-build.log
    exit 1
fi
```

#### pre-push

```
#currentBranch=$(git rev-parse --abbrev-ref HEAD)

#if [ "$currentBranch" == "master" ]; then
#  echo "Error: You cannot push to the master branch directly."
#  exit 1
#fi

# Check for unmerged changes from master
#unmergedChanges=$(git fetch origin master --quiet && git merge-base origin/master HEAD | grep -q .)

#if [ "$unmergedChanges" ]; then
#  echo "Error: Your branch has unmerged changes from the master branch."
#  echo "Please pull and merge the latest changes from master before pushing."
#  exit 1
#fi

# Original Husky pre-push script (if applicable)
# ... (replace with your existing pre-push script, if any)
```

### 8 - Test Everything

Run the following to test docusaurus is running

```
yarn start
```

Run the following to test docusaurus is building

```
yarn build
```

## Despliegue

Este sitio ya **no** se publica en GitHub Pages ni con `docusaurus deploy`.

El build completo se ensambla desde la raíz del monorepo con `yarn build`
(que compila web + este Docusaurus y los une en `dist/` vía
`scripts/merge-builds.mjs`, dejando el Docusaurus bajo `dist/docs/`).
El despliegue lo hace un servidor que hace `pull` del repositorio, corre el
build y sirve `dist/` (dominio de producción: `https://groups.meeplab.com`).
