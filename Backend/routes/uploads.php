<?php
/**
 * FILE UPLOAD ROUTES - Images, contracts, documents
 */

Auth::requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$uploadType = $id ?? 'image';

// =====================================================================
// POST /uploads/image - Upload product/category images
// =====================================================================
if ($method === 'POST' && $uploadType === 'image' && !$action) {
    try {
        if (empty($_FILES['file'])) {
            ResponseHelper::sendError('No file provided', 400);
        }
        
        $file = $_FILES['file'];
        
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            ResponseHelper::sendError('File upload error', 400);
        }
        
        if ($file['size'] === 0 || $file['size'] > MAX_UPLOAD_SIZE) {
            ResponseHelper::sendError('File size invalid', 400);
        }
        
        // Validate mime type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
            ResponseHelper::sendError('Invalid file type. Only images allowed', 400);
        }
        
        // Validate extension
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_IMAGE_EXT)) {
            ResponseHelper::sendError('Invalid file extension', 400);
        }
        
        // Create upload directory if needed
        $uploadDir = UPLOAD_DIR . '/images';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $filename = 'IMG-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $filepath = $uploadDir . '/' . $filename;
        $publicPath = '/Backend/uploads/images/' . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            ResponseHelper::sendError('Failed to save file', 500);
        }
        
        // Save to database if productId provided
        if (!empty($_POST['productId'])) {
            $conn->execute(
                "INSERT INTO product_images (product_id, image_url, alt_text, is_primary)
                 VALUES (:productId, :url, :alt, :isPrimary)",
                [
                    'productId' => $_POST['productId'],
                    'url' => $publicPath,
                    'alt' => $_POST['altText'] ?? '',
                    'isPrimary' => isset($_POST['isPrimary']) ? (int)$_POST['isPrimary'] : 0
                ]
            );
            
            $imageId = $conn->lastInsertId();
        }
        
        Logger::info('Image uploaded', ['filename' => $filename, 'size' => $file['size']]);
        ResponseHelper::sendSuccess(
            ['filename' => $filename, 'url' => $publicPath, 'size' => $file['size']],
            'Image uploaded successfully',
            201
        );
        
    } catch (Exception $e) {
        Logger::error('Image upload error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to upload image', 500);
    }
}

// =====================================================================
// POST /uploads/contract - Upload contracts for CRM
// =====================================================================
if ($method === 'POST' && $uploadType === 'contract' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        if (empty($_FILES['file'])) {
            ResponseHelper::sendError('No file provided', 400);
        }
        
        $file = $_FILES['file'];
        
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            ResponseHelper::sendError('File upload error', 400);
        }
        
        if ($file['size'] === 0 || $file['size'] > MAX_UPLOAD_SIZE) {
            ResponseHelper::sendError('File size invalid', 400);
        }
        
        // Validate mime type - PDF and Office documents only
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        $allowedMime = ['application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'application/vnd.ms-excel',
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        
        if (!in_array($mimeType, $allowedMime)) {
            ResponseHelper::sendError('Only PDF, Word, Excel files allowed', 400);
        }
        
        // Validate extension
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
        if (!in_array($ext, $allowedExt)) {
            ResponseHelper::sendError('Invalid file extension', 400);
        }
        
        // Create upload directory
        $uploadDir = UPLOAD_DIR . '/contracts';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $filename = 'CONTRACT-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $filepath = $uploadDir . '/' . $filename;
        $publicPath = '/Backend/uploads/contracts/' . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            ResponseHelper::sendError('Failed to save file', 500);
        }
        
        // Save to database
        if (!empty($_POST['customerId'])) {
            $payload = Auth::verifyToken(Auth::getToken());
            
            $conn->execute(
                "INSERT INTO customer_documents (customer_id, document_type, file_url, file_name, uploaded_by)
                 VALUES (:customerId, :type, :url, :fileName, :uploadedBy)",
                [
                    'customerId' => $_POST['customerId'],
                    'type' => $_POST['documentType'] ?? 'contract',
                    'url' => $publicPath,
                    'fileName' => $file['name'],
                    'uploadedBy' => $payload['user_id'] ?? null
                ]
            );
        }
        
        Logger::info('Contract uploaded', ['filename' => $filename, 'size' => $file['size']]);
        ResponseHelper::sendSuccess(
            ['filename' => $filename, 'url' => $publicPath, 'size' => $file['size']],
            'Contract uploaded successfully',
            201
        );
        
    } catch (Exception $e) {
        Logger::error('Contract upload error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to upload contract', 500);
    }
}

// =====================================================================
// GET /uploads/contracts/:customerId - Get customer contracts
// =====================================================================
if ($method === 'GET' && $uploadType === 'contracts' && $id) {
    Auth::requireAuth('admin');
    
    try {
        $documents = $conn->fetchAll(
            "SELECT cd.id, cd.document_type, cd.file_url, cd.file_name, u.full_name as uploaded_by, cd.created_at
             FROM customer_documents cd
             LEFT JOIN users u ON cd.uploaded_by = u.id
             WHERE cd.customer_id = :customerId
             ORDER BY cd.created_at DESC",
            ['customerId' => $id]
        );
        
        ResponseHelper::sendSuccess($documents, 'Customer documents retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get documents error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve documents', 500);
    }
}

// =====================================================================
// DELETE /uploads/:id - Delete uploaded file
// =====================================================================
if ($method === 'DELETE' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        // Find file in database
        $file = $conn->fetch(
            "SELECT file_url FROM customer_documents WHERE id = :id",
            ['id' => $id]
        );
        
        if (!$file) {
            ResponseHelper::sendError('File not found', 404);
        }
        
        // Delete from filesystem
        $filePath = __DIR__ . '/..' . $file['file_url'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        // Delete from database
        $conn->execute("DELETE FROM customer_documents WHERE id = :id", ['id' => $id]);
        
        Logger::info('File deleted', ['file_id' => $id]);
        ResponseHelper::sendSuccess(null, 'File deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete file error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete file', 500);
    }
    
    try {
        // Create upload directory
        $uploadDir = UPLOAD_DIR . '/' . $type;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $timestamp = time();
        $random = bin2hex(random_bytes(6));
        $filename = $timestamp . '_' . $random . '.' . $ext;
        $filePath = $uploadDir . '/' . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception('Failed to move uploaded file');
        }
        
        // Set proper permissions
        chmod($filePath, 0644);
        
        $url = '/Backend/uploads/' . $type . '/' . $filename;
        
        Logger::logUpload($filename, true, [
            'type' => $type,
            'size' => $file['size'],
            'mime' => $mimeType,
            'user_id' => $auth['user_id']
        ]);
        
        ResponseHelper::sendSuccess([
            'url' => $url,
            'filename' => $filename,
            'size' => $file['size'],
            'mime_type' => $mimeType
        ], 'File uploaded successfully', 201);
        
    } catch (Exception $e) {
        Logger::logUpload($file['name'], false, ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Upload failed: ' . $e->getMessage(), 500);
    }
}

// =====================================================================
// DELETE IMAGE
// =====================================================================
if ($method === 'DELETE' && $action) {
    if ($auth['role'] !== 'admin') {
        ResponseHelper::sendError('Only admins can delete files', 403);
    }
    
    try {
        $filename = $action;
        $filePath = UPLOAD_DIR . '/' . $type . '/' . $filename;
        
        // Prevent directory traversal
        if (strpos(realpath($filePath), realpath(UPLOAD_DIR)) !== 0) {
            ResponseHelper::sendError('Invalid file path', 400);
        }
        
        if (file_exists($filePath) && is_file($filePath)) {
            unlink($filePath);
            Logger::info('File deleted', ['filename' => $filename, 'user_id' => $auth['user_id']]);
            ResponseHelper::sendSuccess([], 'File deleted successfully');
        } else {
            ResponseHelper::sendError('File not found', 404);
        }
        
    } catch (Exception $e) {
        Logger::error('File deletion error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete file', 500);
    }
}

// If none of the routes match
ResponseHelper::sendError('Upload endpoint not found', 404);
?>
