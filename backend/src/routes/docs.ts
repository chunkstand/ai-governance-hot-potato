import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import YAML from 'js-yaml';

const router = Router();

/**
 * API Documentation Router
 * 
 * Serves:
 * - GET /docs - Swagger UI HTML page
 * - GET /openapi.json - Raw OpenAPI specification as JSON
 * 
 * Per requirement INF-06: API contract documented (OpenAPI/JSON Schema for endpoints)
 */

// Cache the OpenAPI spec to avoid repeated file reads
let openapiSpec: any = null;

/**
 * Load and parse the OpenAPI specification
 */
function loadOpenApiSpec(): any {
  if (openapiSpec) return openapiSpec;
  
  try {
    const yamlPath = resolve(process.cwd(), 'openapi.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    openapiSpec = YAML.load(yamlContent);
    return openapiSpec;
  } catch (error) {
    console.error('Failed to load OpenAPI specification:', error);
    throw new Error('OpenAPI specification not available');
  }
}

/**
 * GET /docs
 * 
 * Serves Swagger UI HTML for interactive API documentation
 */
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Governance Arena API - Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    #swagger-ui { height: 100vh; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * GET /openapi.json
 * 
 * Returns the raw OpenAPI specification as JSON
 */
router.get('/openapi.json', (_req: Request, res: Response) => {
  try {
    const spec = loadOpenApiSpec();
    res.json(spec);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to load API specification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as docsRouter };
