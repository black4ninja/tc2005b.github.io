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

Make a commit to **master** of the first version if everything is running.

Make the configuration for blocking master branch and deploy environment on pages in Github.

### 9 - Uncomment pre-push

Uncomment the pre-push from husky file to block any pushes to master locally.

```
currentBranch=$(git rev-parse --abbrev-ref HEAD)

if [ "$currentBranch" == "master" ]; then
  echo "Error: You cannot push to the master branch directly."
  exit 1
fi

# Check for unmerged changes from master
unmergedChanges=$(git fetch origin master --quiet && git merge-base origin/master HEAD | grep -q .)

if [ "$unmergedChanges" ]; then
  echo "Error: Your branch has unmerged changes from the master branch."
  echo "Please pull and merge the latest changes from master before pushing."
  exit 1
fi

# Original Husky pre-push script (if applicable)
# ... (replace with your existing pre-push script, if any)
```

### 10 - Add scripts got github actions

Create a **.github/workflows** directory and create a **main.yml**, a **test-deploy.yml** and outside workflows in **.github** a **PULL_REQUEST_TEMPLATE.md**

In **main.yml** add the following:
```
# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: [master]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

env:
  # Hosted GitHub runners have 7 GB of memory available, let's use 6 GB
  NODE_OPTIONS: --max-old-space-size=6144

jobs:
  # Single deploy job since we're just deploying
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: yarn
      - name: Install dependencies
        run: yarn install --frozen-lockfile --non-interactive
      - name: Build
        run: yarn build
      - name: Setup Pages
        uses: actions/configure-pages@v3
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          # Upload entire repository
          path: build
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

In the **test-deploy.yml** add the following:

```
name: Test deployment

on:
  pull_request:
    branches:
      - master
    # Review gh actions docs if you want to further define triggers, paths, etc
    # https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#on

jobs:
  test-deploy:
    name: Test deployment
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: yarn

      - name: Install dependencies
        run: yarn install --frozen-lockfile
      - name: Test build website
        run: yarn build
```

In the **PULL_REQUEST_TEMPLATE.md** add the following:
```
<!--- Provide a general summary of your changes in the Title above -->

## Types of changes
<!--- What types of changes does your code introduce? Put an `x` in all the boxes that apply: -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)

## Description
<!--- Describe your changes in detail -->
```
