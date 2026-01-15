# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collection of MediaWiki userscripts designed to enhance Wikipedia editing workflows. The scripts are primarily JavaScript files that run in the browser via MediaWiki's ResourceLoader system, targeting various Wikipedia namespaces and editing scenarios.

## Key Architectural Patterns

### Script Initialization Pattern

All userscripts follow a consistent initialization pattern using jQuery's deferred execution pattern:

```javascript
// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util', 'mediawiki.api', ... ] )
).then(() => {
  // Script logic here
});
```

Key requirements:
- Wrap scripts in `<nowiki>` tags to prevent MediaWiki parsing
- Use `$.ready` to ensure DOM is ready
- Use `mw.loader.using()` to load required MediaWiki modules before execution
- Use arrow functions or standard function callbacks

### Namespace and Page Filtering

Most scripts check namespace and page conditions before executing:

```javascript
// Check namespace number (0=main, 2=user, 6=file, 10=template, 14=category, etc.)
if (mw.config.get('wgNamespaceNumber') !== X) {
  return;
}

// Check specific page name
if (mw.config.get('wgPageName') !== 'Special:SomePage') {
  return;
}

// Check action type (view, edit, submit, etc.)
if (mw.config.get('wgAction') !== 'view') {
  return;
}
```

Common namespace numbers: 0 (main), 2 (user), 3 (user talk), 6 (file), 10 (template), 14 (category).

### MediaWiki API Usage

Scripts use `mw.Api()` for API interactions:

```javascript
const api = new mw.Api();

api.get({
  action: 'query',
  prop: '...',
  titles: '...',
  // ... other parameters
}).then((response) => {
  // Handle response
});
```

Always use `api.get()` or `api.post()` rather than direct `$.get()` calls for MediaWiki API requests.

### VisualEditor Integration

Many scripts integrate with VisualEditor's 2017 wikitext editor using hooks:

```javascript
// Add portlet when VE source editor activates
mw.hook('ve.activationComplete').add(function () {
  // Remove when visual mode (not source)
  if ('visual' === ve.init.target.getSurface().mode) {
    $('#my-portlet').remove();
    return;
  }

  // Add portlet link
  const node = mw.util.addPortletLink('p-tb', '#', 'Label', 'my-id');
  $(node).on('click', handler);
});

// Clean up when VE deactivates
mw.hook('ve.deactivationComplete').add(function () {
  $('#my-portlet').remove();
});
```

Portlet locations: `p-tb` (toolbox), `p-cactions` (more menu), `p-namespaces` (namespace tabs).

### Vue 3 and Codex Components

Modern scripts use Vue 3 and Wikimedia Codex design system:

```javascript
mw.loader.using(['@wikimedia/codex', 'vue']).then(function(require) {
  const Vue = require('vue');
  const Codex = require('@wikimedia/codex');

  const app = Vue.createMwApp({
    data() {
      return {
        // Component state
      };
    },
    template: `...`,
    methods: {
      // Component methods
    }
  });

  app.$mount(mountPoint);
});
```

Use `Vue.createMwApp()` (not `Vue.createApp()`) to ensure MediaWiki compatibility.

### Text Manipulation

For editing wikitext in VisualEditor source mode:

```javascript
const textBox = $('#wpTextbox1');

// Get current content
const content = textBox.textSelection('getContents');

// Set modified content
textBox.textSelection('setContents', modifiedContent);

// Can also prefill edit summary
mw.hook('ve.saveDialog.stateChanged').add(() => {
  ve.init.target.saveDialog.editSummaryInput.$input.val('Edit summary here');
});
```

## Script Categories

### Discussion/Editing Scripts
- `dev.js` - DiscussionCloser: Vue 3 + Codex-based interface for closing discussions with templates
- `book-to-sfn.js` - Converts book citations to shortened footnote format
- `citations-linker.js` - Adds wiki links to citation templates based on URL patterns
- `film-posters.js` - Adds categories to film poster files based on language/country
- `capella-space.js` - Formats Capella Space satellite imagery file descriptions

### Utility Scripts
- `transclusion-count.js` - Shows template/category transclusion counts
- `locked.js` / `locked2.js` - Marks globally locked/blocked user links
- `new-category.js` - Adds "Create" links to Special:WantedCategories

### Maintenance/Testing
- `karna-disruption.js` / `karna-disruption2.js` - TemplateScript-based page disruption tracking
- `templatescript.js` - TemplateScript framework (singleton pattern for sidebar templates)
- `test.js` - Spam removal utility using regex patterns

### Development/Scraping Tools
- `thehindu.js` - Node.js script for scraping news articles (uses Cheerio, got, moment)
- `cbfc.js` - Puppeteer script for scraping film certification data

## Testing

Cypress is available for end-to-end testing. Test configuration is in `cypress.json` (currently empty). Run tests with:

```bash
npx cypress open
```

## Dependencies

Key npm packages:
- `@wikimedia/codex` - Wikimedia Design System components
- `vue` - Vue 3 framework
- `cheerio` - HTML parsing (for Node.js scrapers)
- `puppeteer` - Headless browser automation
- `got` - HTTP client
- `moment` - Date/time manipulation
- `prompts` - Interactive CLI prompts

## Code Conventions

- All userscripts start with `// <nowiki>` comment wrapper
- Use ES6+ features (arrow functions, const/let, template literals)
- Use strict equality (`===`, `!==`)
- Indent with tabs (existing code convention)
- Keep functions focused and modular
- Add JSDoc comments for complex functions only
- Avoid nested try-catch blocks - extract to separate functions
- Use descriptive variable names matching domain concepts (e.g., `api`, `textBox`, `portlet`)

## GitButler PR Workflow

When creating a pull request with GitButler:
- Use `but commit -c -b branch-name -m "description"` to create branch and commit
- Use `but push <branch-name>` to push to remote
- Use `but review publish -b <branch-name> -t` to create PR
  - The `-t` flag uses commit message for PR title/description (prevents placeholder content)
- **No PR description needed** - let commit message speak for itself
- **Always include co-author** - `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` in commit message
