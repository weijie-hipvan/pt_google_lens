Rails.application.routes.draw do
  # API routes
  namespace :api do
    namespace :v1 do
      # Object detection endpoint
      # POST /api/v1/detections
      resources :detections, only: [:create]
    end
  end

  # Health check endpoint for load balancers and uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check

  # Simple health check that returns JSON
  get "health", to: proc { [200, { 'Content-Type' => 'application/json' }, ['{"status":"ok"}']] }
end
