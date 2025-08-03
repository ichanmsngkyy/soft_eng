require 'sinatra'
require 'sinatra/json'
require_relative '../models/user'

before do
  content_type :json
end

# Get all users
get '/users' do
  users = User.all(settings.db_client)
  json users
end

# Get a single user
get '/users/:id' do
  user = User.find(settings.db_client, params[:id])
  halt 404, json({ error: 'User not found' }) unless user
  json user
end

# Create a new user
post '/users' do
  data = JSON.parse(request.body.read)
  id = User.create(settings.db_client, data)
  status 201
  json({ id: id })
end

# Update a user
put '/users/:id' do
  data = JSON.parse(request.body.read)
  User.update(settings.db_client, params[:id], data)
  status 204
end

# Delete a user
delete '/users/:id' do
  User.delete(settings.db_client, params[:id])
  status 204
end 