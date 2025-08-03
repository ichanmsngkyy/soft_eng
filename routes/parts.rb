require 'sinatra'
require 'sinatra/json'
require_relative '../models/part'

# Get all parts
get '/parts' do
  parts = Part.all
  json parts
end

# Get a single part
get '/parts/:id' do
  part = Part.find(params[:id])
  halt 404, json({ error: 'Part not found' }) unless part
  json part
end

# Create a new part
post '/parts' do
  data = JSON.parse(request.body.read)
  # Add validation here
  id = Part.create(data)
  status 201
  json({ id: id })
end

# Update a part
put '/parts/:id' do
  data = JSON.parse(request.body.read)
  Part.update_by_category_id(params[:id], data)
  status 204
end

# Delete a part
delete '/parts/:id' do
  Part.delete(params[:id])
  status 204
end 