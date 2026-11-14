CREATE TABLE IF NOT EXISTS integration_routes (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_url TEXT NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    field_mapping JSONB NOT NULL DEFAULT '{}',
    variables JSONB NOT NULL DEFAULT '{}',
    response_template JSONB,
    output_variables JSONB NOT NULL DEFAULT '{}',
    output_template JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_logs (
    id SERIAL PRIMARY KEY,
    route_slug VARCHAR(60) NOT NULL,
    request_payload JSONB,
    transformed_payload JSONB,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);