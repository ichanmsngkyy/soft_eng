require 'sinatra'
require 'sinatra/json'
require_relative '../models/order'

# Get all orders
get '/orders' do
  orders = Order.all
  json orders
end

# Get a single order
get '/orders/:id' do
  order = Order.find(params[:id])
  halt 404, json({ error: 'Order not found' }) unless order
  json order
end

# Create a new order
post '/orders' do
  data = JSON.parse(request.body.read)
  # Add validation here
  id = Order.create(data)
  status 201
  json({ id: id })
end

# Update an order
put '/orders/:id' do
  data = JSON.parse(request.body.read)
  Order.update(params[:id], data)
  status 204
end

# Delete an order
delete '/orders/:id' do
  Order.delete(params[:id])
  status 204
end 