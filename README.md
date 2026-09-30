<img align="right" width="250" height="47" src="https://raw.githubusercontent.com/gematik/gematik.github.io/master/Gematik_Logo_Flag_With_Background.png"/> <br/> 

# ZTS Template Editor Frontend

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
       <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#key-features">Key Features</a></li>
        <li><a href="#technology-stack">Technology Stack</a></li>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#release-notes">Release Notes</a></li>
        <li><a href="#contributions-and-acknowledgements">Contributions and Acknowledgements</a></li>
      </ul>
	</li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#start-development">Start Development</a></li>
        <li><a href="#npm-scripts">Important npm Scripts</a></li>
        <li><a href="#folder-structure">Folder Structure (Excerpt)</a></li>
        <li><a href="#runtime-configuration">Runtime Configuration</a></li>
        <li><a href="#templates-versions">Templates & Versions</a></li>
        <li><a href="#quality-tests">Quality & Tests</a></li>
        <li><a href="#code-quality">Code Quality (SonarQube)</a></li>
        <li><a href="#deployment-options">Deployment Options</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#additional-notes">Additional Notes and Disclaimer from gematik GmbH</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

A Vue 3 + TypeScript + Vite frontend for managing FHIR package versions,
branch/workspace-based template editing, and related metadata and
changelogs.

### Overview

This project enables: 
-   Viewing and selecting projects or packages 
-   Creating new versions of a package template and setting up a branch 
-   Editing template resources (FHIR templates, metadata for Google Artifact Registry annotations, changelogs, and descriptions of the FHIR packages or resources) 
-   Review approval 
-   Commenting on template input

### Key Features

-   Modern Vue 3 `<script setup>` components
-   Type-safe API access via the central `api()` function
    (`src/api/http.ts`)
-   Dynamic routes for versions & workspaces (Vue Router 4)
-   Naive UI component library
-   Tailwind CSS for layout & utility classes
-   Markdown preview using `marked`
-   Structured template management (`useTemplatesManagement` composable)
-   SonarQube configuration for code quality

### Technology Stack

-   Framework: Vue 3
-   Language: TypeScript
-   Build Tool: Vite
-   UI: Naive UI + Tailwind CSS
-   Markdown: marked
-   Quality: Type Checking via `vue-tsc`, SonarQube Scanner

### Prerequisites

-   Node.js \>= 20
-   npm
-   Docker for container deployment
-   SonarQube Server + `@sonar/scan`

### Release Notes

See [ReleaseNotes.md](./ReleaseNotes.md) for all information regarding the (newest) releases.

### Contributions and Acknowledgements

This open source project was developed in cooperation with the German Federal Institute for Drugs and Medical Devices (BfArM) on the basis of Section 355 (12-14) of the German Social Code Book V (SGB V).
As part of the projects implementation, the fbeta GmbH and Fraunhofer FOKUS were commissioned to provide software development services.

We would like to thank all parties involved for their constructive and trusted collaboration.

## Getting Started

### Installation

``` bash
npm install
```

### Start Development

``` bash
npm run dev
```

By default, Vite runs at `http://localhost:5173` (port may vary). Hot
Module Reloading is enabled.

### Important npm Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Create production build (outputs to `dist/`) |
| `npm run preview` | Local preview of production build |
| `npm exec vue-tsc --noEmit` | Type check without building |

### Folder Structure (Excerpt)

    src/
        api/                # API access (http, projects, workspaces)
        auth/               # oauth2-proxy redirect/auth state helpers
        assets/             # CSS & Images
        components/         # UI & form components
        composables/        # Reusable state/logic
        pages/              # Router pages
        router/             # Vue Router configuration
        services/           # Service abstractions
        theme/              # Naive UI theme overrides
        utils/              # Helper functions
        validation/         # Validation rules

### Runtime Configuration

At runtime, the app reads `window.__APP_CONFIG__`.

- For local development (`npm run dev`), `src/config.ts` falls back to Vite
    env files such as `.env` and `.env.local` when values are not present in
    `window.__APP_CONFIG__`.
- In the Docker image, `config.js` is generated by `docker-entrypoint.sh`
    from environment variables and loaded before the app.

You can use the provided `.env.example` as a template and create a local
`.env.local` file for your desired runtime values.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_ZTS_URL` | Base URL used for footer links (Impressum, Datenschutz, Kontakt, Barrierefreiheit) | `https://terminologien.bfarm.de` |

Behavior of API base resolution (`src/api/http.ts`):
- Requests always stay on the current browser origin (`location.origin`).
- Do not point the browser to the backend port directly. oauth2-proxy must be the browser-facing entry point.

Authentication is handled by oauth2-proxy. The frontend does not store access tokens, does not refresh tokens, and does not set an `Authorization` header. Login redirects to `/oauth2/start?rd=...`; logout redirects to `/oauth2/sign_out?rd=...`. API requests use `credentials: "include"` so the oauth2-proxy session cookie is sent to the proxy.

Example (Local Docker Deployment):

```bash
npm run build
docker build -t template-editor-frontend .
docker run --rm -p 8080:8080 \
    -e VITE_ZTS_URL=https://terminologien.bfarm.de \
    template-editor-frontend
```

Example (Local Development):

```bash
cp .env.example .env.local
# Edit .env.local with desired values
npm run dev
```

### Templates & Versions

-   New version: Route `/projects/:projectId/:packageName/versions/new`
    (mode `create`)
-   Edit: Route
    `/projects/:projectId/:packageName/versions/:version/:workspace?`
    (mode `edit`)
-   Review flag: Checkbox sets `createMergeRequest` on commit
    (`commitWorkspace` call)

### Quality & Tests

Unit tests with Vitest and Vue Test Utils are configured. Run tests with:

``` bash
npm run test
```

This runs all tests with coverage reporting. Output is available in `coverage/lcov.info`


### Code Quality (SonarQube)

Configuration: `sonar-project.properties`. Scan with:

``` bash
npm run sonar-scanner
```

Key entries in `sonar-project.properties`:
- `sonar.sources=src`
- `sonar.coverage.exclusions=**/*.test.ts`
- Coverage reports: `coverage/Files are static and can be served via any web server (Nginx, Apache, GitHub Pages, Azure Static Web Apps, Netlify, etc.).
npm run build
```

Output is located in `dist/`. These files are static and can be served
via any web server (Nginx, Apache, GitHub Pages, Azure Static Web Apps,
Netlify, etc.).

### Static Serving Locally

``` bash
npm run build
```

### Deployment Options
#### Environment Variables
 
| Variable | Default Value | Required | Description |
| --- | --- | --- | --- |
| `VITE_ZTS_URL` | `https://terminologien.bfarm.de` | No | Base URL of the ZTS (Zentraler Terminologie Server). Used to reference the ZTS imprint, privacy policy, contact information, and availability.  |
 
#### Docker (Runtime Override)
 
```bash
docker run --rm -p 8080:8080 \
  -e VITE_ZTS_URL="https://terminologien.bfarm.de" \
  template-editor-frontend
```
 
If no variable is set, the default value is used.

#### Docker (Nginx)

Build & Run:

``` bash
docker build -t template-editor-frontend .
```

## Contributing
If you want to contribute, please check our [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Copyright 2026 gematik GmbH

Apache License, Version 2.0

See the [LICENSE](./LICENSE) for the specific language governing permissions and limitations under the License

## Additional Notes and Disclaimer from gematik GmbH

1. Copyright notice: Each published work result is accompanied by an explicit statement of the license conditions for use. These are regularly typical conditions in connection with open source or free software. Programs described/provided/linked here are free software, unless otherwise stated.
2. Permission notice: Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
1. The copyright notice (Item 1) and the permission notice (Item 2) shall be included in all copies or substantial portions of the Software.
2. The software is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the warranties of fitness for a particular purpose, merchantability, and/or non-infringement. The authors or copyright holders shall not be liable in any manner whatsoever for any damages or other claims arising from, out of or in connection with the software or the use or other dealings with the software, whether in an action of contract, tort, or otherwise.
3. We take open source license compliance very seriously. We are always striving to achieve compliance at all times and to improve our processes. If you find any issues or have any suggestions or comments, or if you see any other ways in which we can improve, please reach out to: ospo@gematik.de
3. Parts of this software and - in isolated cases - content such as text or images may have been developed using the support of AI tools. They are subject to the same reviews, tests, and security checks as any other contribution. The functionality of the software itself is not based on AI decisions.

## Contact
We take open source license compliance very seriously. We are always striving to achieve compliance at all times and to improve our processes.
This software is currently being tested to ensure its technical quality and legal compliance. Your feedback is highly valued.
If you find any issues or have any suggestions or comments, or if you see any other ways in which we can improve, please reach out to: zts@gematik.de.
