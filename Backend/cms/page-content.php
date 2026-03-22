<?php
/**
 * GET block list for a page — ?slug=home&locale=en
 * Replaces extensionless URL /cms/pages/home/content?locale=en
 */
require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/router.php';

remquip_api_bootstrap();

$slug = trim((string) ($_GET['slug'] ?? $_GET['page'] ?? $_GET['pageName'] ?? ''));
if ($slug === '') {
    ResponseHelper::sendError('Query parameter slug (or page / pageName) is required', 400);
}

remquip_dispatch(['cms', 'pages', $slug, 'content']);
