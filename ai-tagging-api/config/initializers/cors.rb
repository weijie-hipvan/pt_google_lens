# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Allow multiple origins: AI Tagging UI and Communa Web
    # FRONTEND_URL: Primary frontend (AI Tagging UI)
    # COMMUNA_WEB_URL: Communa Web application for direct API access
    origins_list = [
      ENV.fetch('FRONTEND_URL', 'http://localhost:3000'),
      ENV.fetch('COMMUNA_WEB_URL', 'http://localhost:5173'),
      # Add production URLs as needed
      'https://communa.com',
      'https://www.communa.com',
      'https://staging.communa.com'
    ].compact.uniq

    origins(*origins_list)

    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      max_age: 86400
  end
end
