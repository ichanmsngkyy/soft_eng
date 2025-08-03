require 'sinatra'
require 'sinatra/json'
require_relative '../models/activity_log'

# Get all activity logs
get '/activity' do
  logs = ActivityLog.all
  json logs
end

# Log a new activity
post '/activity' do
  data = JSON.parse(request.body.read)
  # Attach user_id from JWT payload
  data['user_id'] = env['user']['user_id']
  id = ActivityLog.create(data)
  status 201
  json({ id: id })
end 