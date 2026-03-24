-- Add abandoned_carts table

CREATE TABLE IF NOT EXISTS abandoned_carts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    cart_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'recovered', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(status);

-- If using MySQL/MariaDB instead of Postgres (based on earlier context, it might be MySQL):
-- For MySQL syntax, use this instead if the above fails:
/*
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    cart_data JSON NOT NULL,
    status ENUM('abandoned', 'recovered', 'completed') DEFAULT 'abandoned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_abandoned_carts_email (email),
    INDEX idx_abandoned_carts_status (status)
);
*/
