# CMS-CY Client

A lightweight JavaScript client that dynamically loads articles into static web pages from a headless CMS.

## Installation

Include the following script tags in the `<head>` section of your HTML page:

```html
<script id="cms-cy-api" type="application/json">
  { "url": "https://data.cms.cy", "project": "your-project-name" }
</script>
<script defer src="https://cdn.jsdelivr.net/gh/frangiskos/cms-cy-client@v2.1.0/src/cms-cy.min.js"></script>
```

- Replace `"your-project-name"` with the actual project code defined in your CMS.
- To use the latest version in the v2 series, you can use:

```html
<script defer src="https://cdn.jsdelivr.net/gh/frangiskos/cms-cy-client@v2/src/cms-cy.min.js"></script>
```

## Usage

### Including an Article List

To display a list of articles, add the following `<div>` element where you want the article list to appear:

```html
<div cms-control type="article-list" name="component-name"></div>
```

- Replace `"component-name"` with the name of your article list component configured in the CMS.

### Including a Single Article

To display a single article, add the following `<div>` element where you want the article to appear:

```html
<div cms-control type="single-article" name="component-name"></div>
```

- Replace `"component-name"` with the name of your single article component configured in the CMS.

## Configuration

Ensure that you have included the CMS configuration script with the correct project code:

```html
<script id="cms-cy-api" type="application/json">
  { "url": "https://data.cms.cy", "project": "your-project-name" }
</script>
```

## Updating the Version

To create a new release:

1. Update the version in `package.json` to the new version number.
2. Create a new Git tag that corresponds to the version. For example: `v2.2.0`.
3. Push the tag to GitHub:

```Bash
   git tag v2.2.0
   git push origin v2.2.0
```

The new version will then be available via jsDelivr using the versioned URL:

```html
<script defer src="https://cdn.jsdelivr.net/gh/frangiskos/cms-cy-client@v2.2.0/src/cms-cy.min.js"></script>
```

## Purging CDN Cache

If you need to purge the cached version of your script on jsDelivr:

- Single File Purge:
  - CDN URL: `https://cdn.jsdelivr.net/gh/frangiskos/cms-cy-client@v2.1.0/src/cms-cy.min.js`
  - Purge URL: `https://purge.jsdelivr.net/gh/frangiskos/cms-cy-client@v2.1.0/src/cms-cy.min.js`
- Multiple Files Purge (up to 20):
  - Send a POST request to `https://purge.jsdelivr.net/` with a JSON body specifying the paths to purge.

```Bash
  curl -X POST \
    https://purge.jsdelivr.net/ \
    -H 'Content-Type: application/json' \
    -d '{
      "path": [
        "/gh/frangiskos/cms-cy-client@v2.1.0/src/cms-cy.min.js",
        "/gh/frangiskos/cms-cy-client@v2.1.0/src/another-file.js"
      ]
    }'
```

**Note**: Purging is effective on dynamic URLs like `/latest/` or version aliasing `/v2/`.

## Example Integration

### Including the CMS-CY Client in Your Website

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Your Page Title</title>
    <!-- CMS-CY Configuration -->
    <script id="cms-cy-api" type="application/json">
      { "url": "https://data.cms.cy", "project": "your-project-name" }
    </script>
    <!-- CMS-CY Client Script -->
    <script defer src="https://cdn.jsdelivr.net/gh/frangiskos/cms-cy-client@v2/src/cms-cy.min.js"></script>
  </head>
  <body>
    <!-- Article List Component -->
    <div cms-control type="article-list" name="list-component-name"></div>

    <!-- Single Article Component -->
    <div cms-control type="single-article" name="article-component-name"></div>
  </body>
</html>
```

- Replace `"your-project-name"` with your CMS project code.
- Replace `"list-component-name"` and `"article-component-name"` with your component names.

## Additional Information

- **Project Purpose**: This script dynamically loads articles into static web pages from a headless CMS, allowing content updates without changing the site's code.
- **Delivery via jsDelivr**: The script is delivered using [jsDelivr](https://www.jsdelivr.com/), a free CDN for open-source projects.
