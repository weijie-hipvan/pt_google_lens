Rails.application.routes.draw do
  # API routes
  namespace :api do
    namespace :v1 do
      # Object detection endpoint
      # POST /api/v1/detections
      resources :detections, only: [:create]

      # Visual search endpoint (Google Lens style)
      # POST /api/v1/visual_searches
      resources :visual_searches, only: [:create]

      # Shopping/price search endpoint
      # POST /api/v1/shopping_searches
      resources :shopping_searches, only: [:create]
    end
  end

  # Health check endpoint for load balancers and uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check

  # Simple health check that returns JSON
  get "health", to: proc { [200, { 'Content-Type' => 'application/json' }, ['{"status":"ok"}']] }
end
