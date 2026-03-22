<?php
/**
 * Public CMS page sections — delegates to the same handler as:
 *   GET api.php?path=cms/pages/{slug}/content&locale=en
 *
 * Query: slug (or page | pageName), optional locale (passed through to cms route).
 */
$slug = trim((string) ($_GET['slug'] ?? $_GET['page'] ?? $_GET['pageName'] ?? ''));
if ($slug === '') {
    require_once dirname(__DIR__) . '/bootstrap.php';
    require_once dirname(__DIR__) . '/router.php';
    remquip_api_bootstrap();
    ResponseHelper::sendError('Query parameter slug (or page / pageName) is required', 400);
}

// Prevent path injection in the logical route (CMS slugs are alphanumeric + hyphen/underscore).
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $slug)) {
    require_once dirname(__DIR__) . '/bootstrap.php';
    require_once dirname(__DIR__) . '/router.php';
    remquip_api_bootstrap();
    ResponseHelper::sendError('Invalid slug', 400);
}

$_GET['path'] = 'cms/pages/' . $slug . '/content';
require dirname(__DIR__) . '/api.php';
